// Imports
const cds = require("@sap/cds");
const SequenceHelper = require("./lib/SequenceHelper");
const { Readable, PassThrough } = require('stream');
const fs = require("fs");
const excelToJson = require('convert-excel-to-json');
/**
* The service implementation with all service handlers
*/

module.exports = cds.service.impl(async function () {
    // Define constants for the Risk and BusinessPartners entities from the risk-service.cds file
    const { Risks, BusinessPartners, MediaFile } = this.entities;
    /**
    * Set criticality after a READ operation on /risks
    */
    this.after("READ", Risks, (data) => {
        const risks = Array.isArray(data) ? data : [data];
        risks.forEach((risk) => {
            if (risk.impact >= 100000) {
                risk.criticality = 1;
            } else if (risk.impact >= 50000) {
                risk.criticality = 2;
            } else {
                risk.criticality = 3;
            }
        });
    });

    const BPsrv = await cds.connect.to("API_BUSINESS_PARTNER");
    /**
    * Event-handler for read-events on the BusinessPartners entity.
    * Each request to the API Business Hub requires the apikey in the header.
    */
    this.on("READ", BusinessPartners, async (req) => {
        console.log(process.env.apikey);
        // The API Sandbox returns alot of business partners with empty names.
        // We don't want them in our application
        req.query.where("LastName <> '' and FirstName <> '' ");
        return await BPsrv.transaction(req).send({ query: req.query, headers: { apikey: process.env.apikey } });
    });


    /**
* Event-handler on risks.
* Retrieve BusinessPartner data from the external API
*/
    this.on("READ", Risks, async (req, next) => {
        /*
        Check whether the request wants an "expand" of the business partner
        As this is not possible, the risk entity and the business partner
        entity are in different systems (SAP BTP and S/4 HANA Cloud),
        if there is such an expand, remove it
        */
       console.log('READ-RISKS-Line51');
        console.log(req.query);
        if(req.query.SELECT.columns == undefined) return next();
        const expandIndex = req.query.SELECT.columns.findIndex(
            ({ expand, ref }) => expand && ref[0] === "bp"
        );
        if (expandIndex < 0) return next();
        req.query.SELECT.columns.splice(expandIndex, 1);
        if (!req.query.SELECT.columns.find((column) => column.ref.find((ref) => ref == "bp_BusinessPartner") ) ) {
            req.query.SELECT.columns.push({ ref: ["bp_BusinessPartner"] });
        }
        /*
        Instead of carrying out the expand, issue a separate request for each business partner
        This code could be optimized, instead of having n requests for n business partners, just one bulk request could be created
        */
        try {
            const res = await next();
            await Promise.all(
                res.map(async (risk) => {
                    const bp = await BPsrv.transaction(req).send({
                        query: SELECT.one(this.entities.BusinessPartners)
                            .where({ BusinessPartner: risk.bp_BusinessPartner })
                            .columns(["BusinessPartner", "LastName", "FirstName"]),
                        headers: {
                            apikey: 123,
                        },
                    });
                    risk.bp = bp;
                })
            );
        } catch (error) { console.log(error) }
    });

    this.before('CREATE', MediaFile, async (req) => {
        const db = await cds.connect.to("db");
        // Create Constructor for SequenceHelper 
        // Pass the sequence name and db
        const SeqReq = new SequenceHelper({sequence: "MEDIA_ID", db: db, table: "riskmanagement_MediaFile", field:"ID" });
        //Call method getNextNumber() to fetch the next sequence number 
        let seq_no = await SeqReq.getNextNumber();
        // Assign the sequence number to id element
        req.data.id = seq_no;
        //Assign the url by appending the id
        req.data.url = `/service/filemgmt/MediaFile(${req.data.id})/content`;
    });

    // this.before('PUT', MediaFile, async (req, next) => {
    //     console.log(req.data);
    //     console.log(req.file);
    //     console.log(req.data.id);
    //     const url = req._.req.path;
    //     if(url.includes('content')){
    //         const id = req.data.id;
    //         const stream = new PassThrough()
    //         const chunks = []
    //         stream.on('data', chunk => {
    //           chunks.push(chunk)
    //         })
    //         stream.on('end', () => {
    //           //obj.media = Buffer.concat(chunks);
    //           const filename = id+'.xlsx';
    //           fs.writeFileSync(__dirname+"/lib/"+filename, '');
    //           const fd = fs.openSync(__dirname+"/lib/"+filename, "r+");
    //           const numberOfBytesWritten = fs.writeSync(fd, Buffer.concat(chunks), 0);
    //           console.log('numberOfBytesWritten'+numberOfBytesWritten);
    //         })
    //         req.data.content.pipe(stream);        
    //     }
    // });    

    this.on('parseBOQFile', async(req)=>{
        console.log("reached parseBOQFile");
        console.log(req.data);
        const id = req.data.fileid;
        const db = await cds.connect.to("db");
        const filedata = await db.run(`SELECT content FROM riskmanagement_MediaFile where id = ${id}`);
        console.log(filedata);
        const filename = id+'.xlsx';
        fs.writeFileSync(__dirname+"/lib/"+filename, '');
        const fd = fs.openSync(__dirname+"/lib/"+filename, "r+");
        const numberOfBytesWritten = fs.writeSync(fd, filedata[0].CONTENT, 0);    
        const result = excelToJson({
            sourceFile: __dirname+"/lib/"+filename,
            header:{ rows: 1 },
            columnToKey: {
                'A': '{{A1}}',
                'B': '{{B1}}',
                'C': '{{C1}}',
                'D': '{{D1}}',
                'E': '{{E1}}',
                'F': '{{F1}}',
                'G': '{{G1}}',
                'H': '{{H1}}',
                'I': '{{I1}}',
                'J': '{{J1}}'           
            }
        });          
        fs.unlinkSync(__dirname+"/lib/"+filename);
        console.log(result);  
        let jsonExcelData = result[Object.keys(result)[0]], aOutput=[], oOutput={};
        for(let i=0; i<jsonExcelData.length; i++){
            oOutput.slno        = jsonExcelData[i]['Sl No'] == undefined ? '' : jsonExcelData[i]['Sl No'];
            oOutput.type        = jsonExcelData[i]['Type'] == undefined ? '' : jsonExcelData[i]['Type'];
            oOutput.boqdesc     = jsonExcelData[i]['BOQ Description'] == undefined ? '' : jsonExcelData[i]['BOQ Description'];
            oOutput.uom         = jsonExcelData[i]['UOM'] == undefined ? '' : jsonExcelData[i]['UOM'];
            oOutput.quantity    = jsonExcelData[i]['Qty'] == undefined ? 0 : jsonExcelData[i]['Qty'];
            oOutput.rate        = jsonExcelData[i]['Rate'] == undefined ? 0.0 : jsonExcelData[i]['Rate'];
            oOutput.amount      = jsonExcelData[i]['Amount'] == undefined ? 0.0 : jsonExcelData[i]['Amount'];
            oOutput.taxcode     = jsonExcelData[i]['Tax Code'] == undefined ? '' : jsonExcelData[i]['Tax Code'];
            oOutput.actcode     = jsonExcelData[i]['Activity Code'] == undefined ? '' : jsonExcelData[i]['Activity Code'];
            oOutput.wbscode     = jsonExcelData[i]['WBS Code'] == undefined ? '' : jsonExcelData[i]['WBS Code'];
            aOutput.push(JSON.parse(JSON.stringify(oOutput)));
        }
        return aOutput;
    })

});