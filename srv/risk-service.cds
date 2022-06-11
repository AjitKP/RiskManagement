using {riskmanagement as rm} from '../db/schema';

@path : 'service/risk'
service RiskService {
    entity Risks @(restrict : [
        {
            grant : ['READ'],
            to    : ['RiskViewer']
        },
        {
            grant : ['*'],
            to    : ['RiskManager']
        }
    ])                      as projection on rm.Risks;

    annotate Risks with @odata.draft.enabled;

    entity Mitigations @(restrict : [
        {
            grant : ['READ'],
            to    : ['RiskViewer']
        },
        {
            grant : ['*'],
            to    : ['RiskManager']
        }
    ])                      as projection on rm.Mitigations;

    annotate Mitigations with @odata.draft.enabled;

    @readonly
    entity BusinessPartners as projection on rm.BusinessPartners;
}

@path : 'service/filemgmt'
service FileMgmtService {

    entity MediaFile as projection on rm.MediaFile;

    type fileBOQData {
        slno: String(10);
        type: String(10);
        boqdesc: LargeString;
        uom: String(20);
        quantity: Integer;
        rate: Decimal(7, 7);
        amount: Decimal(15, 7);
        taxcode: String(20);
        actcode: String(20);
        wbscode: String(20);
    }

    action parseBOQFile(fileid:Integer) returns array of fileBOQData; 
}
