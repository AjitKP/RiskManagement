module.exports = class SequenceHelper {
    constructor(options) {
        this.db = options.db;
        this.sequence = options.sequence;
        this.table = options.table;
        this.field = options.field || "ID";
    }

    getNextNumber() {
        return new Promise((resolve, reject) => {
            let nextNumber = 0;
            console.log('DB Kind:'+this.db.kind);
            switch (this.db.kind) {
                case "hana":
                    this.db.run(`SELECT "${this.sequence}".NEXTVAL FROM DUMMY`)
                        .then(result => {
                            nextNumber = result[0][`${this.sequence}.NEXTVAL`];
                            resolve(nextNumber);
                        })
                        .catch(error => {
                            reject(error);
                        });

                    break;
                case "sql":
                case "sqlite":
                    this.db.run(`SELECT MAX("${this.field}") FROM "${this.table}"`)
                        .then(result => {
                            console.log(result);
                            nextNumber = result[0][`MAX("${this.field}")`] == null? 0 : result[0][`MAX("${this.field}")`];
                            nextNumber = parseInt(nextNumber) + 1;
                            resolve(nextNumber);
                        })
                        .catch(error => {
                            reject(error);
                        });
                    break;
                default:
                    reject(new Error(`Unsupported DB kind --> ${this.db.kind}`));
            }
        });
    }
};