namespace riskmanagement;

using {managed} from '@sap/cds/common';

entity Risks : managed {
    key ID          : UUID @(Core.Computed : true);
        title       : String(100);
        owner       : String;
        prio        : String(5);
        descr       : String;
        miti        : Association to Mitigations;
        impact      : Integer;
        bp : Association to BusinessPartners;
        // You will need this definition in a later step
        criticality : Integer;
}

entity Mitigations : managed {
    key ID       : UUID @(Core.Computed : true);
        descr    : String;
        owner    : String;
        timeline : String;
        risks    : Association to many Risks
                       on risks.miti = $self;
}

entity MediaFile : managed {
    key id        : Integer;  
        content   : LargeBinary @Core.MediaType : mediaType;        
        mediaType : String @Core.IsMediaType : true;
        fileName  : String;
        url       : String;
};

using { API_BUSINESS_PARTNER as external } from '../srv/external/API_BUSINESS_PARTNER.csn';

entity BusinessPartners as projection on external.A_BusinessPartner{
    key BusinessPartner,
    LastName,
    FirstName,
    
};