public class FinancialReportController {
    
    @AuraEnabled
    Public Static MetadataWrapper getCAMReportMdt(){
        MetadataWrapper mw = new MetadataWrapper();
        Map<String,List<CAM_Report_Rows__mdt>> reportMap = new Map<String,List<CAM_Report_Rows__mdt>>();
        Map<String,List<String>> formulaLitMap = new Map<String,List<String>>();
        Map<String,Decimal> orderMap = new Map<String,Decimal>();
        for(CAM_Report_Table__mdt  table : [SELECT ID,MasterLabel,Order__c FROM CAM_Report_Table__mdt]){
            orderMap.put(table.MasterLabel, table.Order__c);
        }
        for(CAM_Report_Rows__mdt  report : [SELECT ID,Mandatory__c ,CAM_Report_Table__c,Order__c, CAM_Report_Table__r.MasterLabel,Display_Type__c ,Field_Type__c ,Formula__c ,JSON_Key__c ,Row_Label__c FROM CAM_Report_Rows__mdt ORDER BY Order__c ASC]){
            if(reportMap.containsKey(report.CAM_Report_Table__r.MasterLabel)){
                reportMap.get(report.CAM_Report_Table__r.MasterLabel).add(report);
            }
            else{
                reportMap.put(report.CAM_Report_Table__r.MasterLabel, new List<CAM_Report_Rows__mdt>{report});
            }
            if(report.Field_Type__c == 'Formula'){
                Set<String> litList = new Set<String>();
                if(report.Formula__c != null && String.isNotBlank(report.Formula__c)){
                    litList = getListOfLit(report.Formula__c);
                }
                formulaLitMap.put(report.JSON_Key__c,new List<String>(litList));
            }
        }
        mw.reportMap = reportMap;
        mw.formulaMap = formulaLitMap;
        mw.orderMap = orderMap;
        return mw;
        
    }
    
    Public Static Set<String> getListOfLit(String formula){
        Set<String> litList = new Set<String>();
        String[] strList = formula.split('[-+*/()]');
        for(String str : strList){
            if(Str != null && str != '' && !String.isEmpty(str)){
                litList.add(str);
            }
        }
        return litList;
    }
    
    @AuraEnabled
    public static string saveJsonAsFile(Object obj,String parentId){
        try {
            
            ContentVersion contVerFile = new ContentVersion();
            ContVerFile.VersionData = Blob.valueOf(JSON.serialize(obj));
            ContVerFile.Title = 'Financial Details'; 
            ContVerFile.ContentLocation= 's';
            ContVerFile.Document_Type__c= 'Financial Details';
            ContVerFile.PathOnClient='Financial Details.txt';
            ContVerFile.FirstPublishLocationId = parentId;
            insert ContVerFile;
            return ContVerFile.Id;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled
    public static String getFileId(String parentId){
        String verData = null;
        try {
            List<ContentDocumentLink> conDocList = [SELECT Id, ContentDocument.LatestPublishedVersion.VersionData FROM 
                                                    ContentDocumentLink WHERE LinkedEntityId = :parentId and ContentDocument.Title = 'Financial Details'
                                                    order by SystemModstamp desc limit 1];
            if(!conDocList.isEmpty()){
                verData = conDocList[0].ContentDocument.LatestPublishedVersion.VersionData.toString();
            }
            return verData;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled
    public static Map<String,String> getRelatedFiles(String parentId){
        String verData = null;
        Set<Id> applicantIds = new Set<Id>();
        Map<String,ContentDocumentLink> fsDocMap = new Map<String,ContentDocumentLink>();
        Map<String,String> jsonMap = new Map<String,String>();
        try {
            for(Applicant__c app : [Select Id FROM Applicant__c WHERE Loan__c =:parentId]){
                applicantIds.add(app.id);
            }
            for(ContentDocumentLink cv : [SELECT Id,LinkedEntityId,LinkedEntity.Name,ContentDocumentId, ContentDocument.LatestPublishedVersion.VersionData FROM 
                                          ContentDocumentLink WHERE LinkedEntityId in :applicantIds and ContentDocument.Title = 'Financial Details'
                                          order by SystemModstamp ASC]){
                                              if(!fsDocMap.containsKey(cv.LinkedEntityId)){
                                                  fsDocMap.put(cv.LinkedEntity.Name, cv);
                                              } 
                                              
                                          }
            if(fsDocMap != null){
                for(String app : fsDocMap.keySet()){
                    ContentDocumentLink doc = fsDocMap.get(app);
                    if(doc.ContentDocument.LatestPublishedVersion.VersionData != null){
                        String json = doc.ContentDocument.LatestPublishedVersion.VersionData.toString();
                        jsonMap.put(app,json);
                    }
                }
            }
            return jsonMap;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    Public Class FormulaWrapper{
        @AuraEnabled
        Public String jsonkey;
        @AuraEnabled
        Public String formula;
        
    }
    
    Public Class MetadataWrapper{
        @AuraEnabled
        Public Map<String,List<CAM_Report_Rows__mdt>> reportMap;
        @AuraEnabled
        Public Map<String,List<String>> formulaMap;
        @AuraEnabled
        Public Map<String,Decimal> orderMap;
        
    }    
}