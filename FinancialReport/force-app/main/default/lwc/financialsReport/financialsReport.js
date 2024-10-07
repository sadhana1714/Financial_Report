import { api, LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getCAMReportMdt from '@salesforce/apex/FinancialReportController.getCAMReportMdt';
import saveFile from '@salesforce/apex/FinancialReportController.saveJsonAsFile';
import getFile from '@salesforce/apex/FinancialReportController.getFileId';
import NUMBER_OF_YEARS from '@salesforce/label/c.Years_Financial_Report';
export default class FinancialsReport extends LightningElement {

    @api recordId;
    @track reportMap;
    numberOfYears = 4;
    tabOut = true;
    currentYear;
    @track tableList = [];
    @track userInputList = [];
    @track formulas = [];
    @track formulaLitMap = [];
    @track auditInfo = [];
    @track financialInfo = {};
    @track auditHeaders = [];
    @track auditMap = [];
    @track orderMap = [];
    @track auditedList = [];
    @track errorList = [];
    @track firstYearOptions = [];
    @track secondYearOptions = [];
    isCalculated = false;
    isUpdate = false;
    inc;
    dec;
    isEdit = false;
    isLoaded = true;
    incdeclabel = 'YoY';
    showYoY = false;
    isYoY = false;
    incValue;
    decValue;
    label ={
        NUMBER_OF_YEARS
    }


    get auditOptions() {
        return [
                { label: 'Audited', value: 'Audited' },
                { label: 'Provisional', value: 'Provisional' },
                { label: 'Projected', value: 'Projected' },
            ];
    }

    connectedCallback() {
        this.numberOfYears = this.label.NUMBER_OF_YEARS;
        this.isEdit = false;
        const d = new Date();
        let month = d.getMonth();
        this.currentYear = d.getFullYear();
        if(month<4){
            this.currentYear = this.currentYear -1;
        }       
        this.auditData();
        this.getFileData();
    }

    //audit json
    auditData(){
        let auditInfo = [];
        let startDateList = [];
        let endDateList = [];
        let finTypeList = [];
        this.auditHeaders = ['Start Date','End Date','Financial Type'];
        for (let year = this.currentYear; year >= (this.currentYear - this.numberOfYears); year--) {
            startDateList.push('01/04/'+String(year));
            endDateList.push('31/03/'+String(year+1));
            finTypeList.push({key:String(year),value:'',isDisabled:false});
            this.firstYearOptions.push({label: String(year), value: String(year)});
            this.secondYearOptions.push({label: String(year), value: String(year)});
        }
        this.auditInfo.push({label:'Start Date',audata:startDateList,isPicklist:false,style:'datatable-orange'});
        this.auditInfo.push({label:'End Date',audata:endDateList,isPicklist:false,style:'datatable-orange'});
        this.auditInfo.push({label:'Financial Type',audata:finTypeList,isPicklist:true,style:''});
    }

    //json creation from metadata
    getTableMetadata(isFile) {
        getCAMReportMdt({})
            .then(data => {
                this.reportMap = data.reportMap;
                this.formulaLitMap = data.formulaMap;
                this.orderMap = data.orderMap;
                let headerList = [];
                let formulas = new Map();
                for (let year = this.currentYear; year >= (this.currentYear - this.numberOfYears); year--) {
                    headerList.push({ label: 'FY ' + year, key: year });
                }
                for (let i in this.reportMap) {
                    let rows = this.reportMap[i];
                    let dataList = [];

                    for (let j in rows) {
                        let disableClass = 'slds-hint-parent';
                        let disable = false;
                        let display = false;
                        if(rows[j].Display_Type__c == 'Currency'){
                            display = true;
                        }
                        else{
                            display = false;
                        }
                        if (rows[j].Field_Type__c == 'Formula') {
                            formulas.set(rows[j].JSON_Key__c, rows[j].Formula__c);
                            disableClass = disableClass + ' datatable-orange';
                            disable = true;
                        }
                        if (!isFile) {
                            let eachRow = [];
                            for (let year = this.currentYear; year >= (this.currentYear - this.numberOfYears); year--) {
                                eachRow.push({ label: 'FY ' + year, value: '', key: rows[j].JSON_Key__c + year ,disable: disable,required:false,year:year,border:''});
                            }
                            let incdec = {};
                            incdec.idkey = i+'incdec';
                            incdec.idvalue = '';
                            dataList.push({ mandatory: rows[j].Mandatory__c,disclass: disableClass, key: rows[j].JSON_Key__c, label: rows[j].Row_Label__c, display: display, input: rows[j].Field_Type__c, yeardata: eachRow ,incdec:incdec});
                        }

                    }
                    if (!isFile) {                       
                        this.tableList.push({ label: i, data: dataList, headerList: headerList,order:this.orderMap[i],incdeclabel:'YoY'});
                    }
                    
                }
                this.formulas = formulas;
                this.tableList.sort(function(a, b) {
                    return ((a.order < b.order) ? -1 : ((a.col1 == b.col1) ? 0 : 1));
                });
                this.financialInfo.tableList=this.tableList;
                this.financialInfo.auditList=this.auditInfo;
                this.isLoaded = false;
            })
            .catch(error => {
                console.error(error);
            })
    }

    //getting the file info if already saved
    getFileData() {
        if (this.recordId != null) {
            this.tableList = [];
            getFile({ parentId: this.recordId })
                .then(result => {
                    if (result != undefined && result != null) {
                        this.showYoY = true;
                        let response = JSON.parse(result);
                        this.tableList = response.tableList;
                        this.auditInfo = response.auditList;
                        this.financialInfo.tableList=this.tableList;
                        this.financialInfo.auditList=this.auditInfo;
                        for (let i in this.tableList) {
                            let data = this.tableList[i].data;
                            for (let j in data) {
                                let row = data[j].yeardata;
                                for (let k in row) {
                                    if (row[k].value) {
                                        this.userInputList[row[k].key] = row[k].value;
                                    }
                                }
                            }
                        }
                        for(let key in this.auditInfo){
                            let audit = this.auditInfo[key].audata;
                            if(this.auditInfo[key].label == 'Financial Type'){
                                for(let dt in audit){
                                    if (audit[dt].value) {
                                        this.userInputList[audit[dt].key] = audit[dt].value;
                                        
                                    }                                    
                                }                               
                            }                           
                        }
                        this.getTableMetadata(true);                        
                    }
                    else {
                        this.getTableMetadata(false);
                    }
                })
                .catch(error => {
                    this.isLoaded = false;
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Error getting details',
                            message: error.message,
                            variant: 'error',
                        }),
                    );
                });

        }
    }

    //user input change event
    inputChange(event) {
        this.isCalculated = false;
        let name = event.target.name;
        let value = event.target.value;
        let dataid = event.target.id;
        this.userInputList[name] = value;
        if(!dataid.includes('picklist')){
            let element = this.template.querySelector(`[data-id="${name}"]`);
            element.setCustomValidity("");
            element.reportValidity();
    }
        }
        

    focusChange(event){
        this.isCalculated = false;
        let name = event.target.name;
        let value = event.target.value;
        let dataid = event.target.id;
        this.userInputList[name] = value;
        if(!dataid.includes('picklist')){
            let element = this.template.querySelector(`[data-id="${name}"]`);
            element.setCustomValidity("");
            element.reportValidity();
    }
    this.handleCalculate();
    }

    //calculate formulas
    handleCalculate() {
        this.isCalculated = true;
        this.incdeclabel = 'YoY';
        this.isLoaded = true;
                this.auditMap = [];
                this.auditedList = [];
                for (let year = this.currentYear; year >= (this.currentYear - this.numberOfYears); year--) {
                    let auditkey = String(year);
                    if(this.userInputList[auditkey] && this.userInputList[auditkey] != null && this.userInputList[auditkey] != ''){
                        this.auditMap.push(year);
                        if( this.userInputList[auditkey] == 'Audited'){                           
                                let yearLabel = 'FY '+auditkey;
                                this.auditedList.push(yearLabel);                                                      
                        }     
                    }
                                   
                    for (let key in this.formulaLitMap) {
                        let uniqueKey = key + year;                       
                        this.userInputList[uniqueKey] = null;
                        let formulaLit = this.formulaLitMap[key];
                        let valueMap = [];
                        for (let i in formulaLit) {
                            let valueKey = formulaLit[i] + year;
                            let value = '';
                            if(this.userInputList[valueKey]){
                                value = this.userInputList[valueKey];
                            }                           
                            valueMap.push({ key: formulaLit[i], value: value});
                        }
                        let evaluatedValue = this.evaluateFormula(key, valueMap);
                        if (evaluatedValue) {
                            this.userInputList[uniqueKey] = evaluatedValue.toFixed(2);
                        }
                        else{
                            this.userInputList[uniqueKey] = null;
                        }
                    }
                }
                if(this.auditMap.length>=2){
                    this.inc = String(this.auditMap[0]);
                    this.dec = String(this.auditMap[1]);                   
                }
                    this.createFSJson(false);            
    }

    //formul evaluation
    evaluateFormula(key, valueMap) {
        for (let i in valueMap) {
            window[valueMap[i].key] = Number(valueMap[i].value);
        }
        let formula = String(this.formulas.get(key));
        let value = eval(formula);
        return value;
    }

    //final json creation
    createFSJson(isUpdated) {
        this.errorList = [];
        let updatedTableList = this.tableList;        
        for (let i in updatedTableList) {
            if(this.inc && this.dec){
                updatedTableList[i].incdeclabel = 'YoY '+this.inc+' / '+this.dec;
            }            
            let data = updatedTableList[i].data;
            let dataList = [];
            for (let j in data) {
                let row = data[j].yeardata;
                let eachRow = [];
                for (let k in row) {
                    if (this.userInputList[row[k].key]) {
                        row[k].value = this.userInputList[row[k].key];
                    }
                    else{
                        row[k].value = '';
                    }
                    if(this.auditedList.includes(row[k].label) && data[j].mandatory){
                        if(!row[k].value || row[k].value == null || row[k].value == '') {
                            this.errorList.push(row[k].key);
                        }
                    }                    
                    if(isUpdated && this.auditedList.includes(row[k].label)){
                        row[k].disable = true;
                    }
                    eachRow.push(row[k]);
                }
                data[j].yeardata = eachRow;
                if(this.inc && this.dec){
                    let inckey = data[j].key+this.inc;
                    let deckey = data[j].key+this.dec;
                    if(this.userInputList[inckey] && this.userInputList[deckey]){
                        data[j].incdec.idvalue = (((this.userInputList[inckey]/this.userInputList[deckey])-1)*100).toFixed(0).toString()+' %';
                    }
                    else{
                        data[j].incdec.idvalue = '';
                    }
                }                
                dataList.push(data[j]);
            }
            updatedTableList[i].data = dataList;
        }
        let updatedAuditInfo = this.auditInfo;
        for(let key in updatedAuditInfo){
            let audit = updatedAuditInfo[key].audata;
            let auditData = [];
            if(updatedAuditInfo[key].label == 'Financial Type'){
                for(let dt in audit){
                    if (this.userInputList[audit[dt].key]) {
                        audit[dt].value = this.userInputList[audit[dt].key];
                    }
                    if(isUpdated && this.auditedList.includes('FY '+audit[dt].key)){
                        audit[dt].isDisabled = true;
                    }
                    auditData.push(audit[dt]);
                }
                updatedAuditInfo[key].audata = auditData;
            }           
        }
        this.tableList = updatedTableList;
        this.auditInfo = updatedAuditInfo;
        this.financialInfo.tableList=this.tableList;
        this.financialInfo.auditList=this.auditInfo;
        this.isLoaded = false;
    }

    handleSave() {
        this.isLoaded = true;
        if(!this.isCalculated){
            this.handleCalculate();
        }        
        if (this.financialInfo) {
            if(this.errorList.length>0){               
                for(let i in this.errorList){
                    let name = this.errorList[i];
                    console.log(name);
                    let element = this.template.querySelector(`[data-id="${name}"]`);
                    element.setCustomValidity("Complete this field");
                    element.reportValidity();
                }
                this.isLoaded = false;
                this.isCalculated = false;
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error',
                        message: 'Please populate all the required financials for audited years below',
                        variant: 'error',
                    }),
                );
            }
            else{
            this.createFSJson(true);
            saveFile({ obj: this.financialInfo, parentId: this.recordId })
                .then(result => {
                    this.showYoY = true;
                    this.isEdit = false;
                    this.isLoaded = false;
                    this.isCalculated = false;
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Success',
                            message: 'Financial details saved succesfully',
                            variant: 'Success',
                        }),
                    );
                })
                .catch(error => {
                    this.isLoaded = false;
                    this.isCalculated = false;
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Error saving financial details',
                            message: error.message,
                            variant: 'error',
                        }),
                    );
                });
            }
        }
    }

    handleEdit(){
        this.isEdit = true;
    }
    handleYoY(){
        this.isYoY = true;
    }
    closeModal() {
        this.isYoY = false;
    }
    yoyChange(event){
        let name = event.target.name;
        let value = event.target.value;
        console.log(name);
        console.log(value);
        if(name == 'inc'){
            this.incValue = value;
        }
        else if(name == 'dec'){
            this.decValue = value;
        }
    }
    submitDetails(){
        this.isLoaded = true;
        let updatedTableList = this.tableList;
        this.isYoY = false;
        for (let i in updatedTableList) {
            if(this.incValue && this.decValue){
                updatedTableList[i].incdeclabel = 'YoY '+this.incValue+' / '+this.decValue;
            }
            
            let data = updatedTableList[i].data;
            let dataList = [];
            for (let j in data) {
                if(this.incValue && this.decValue){
                    let inckey = data[j].key+this.incValue;
                    let deckey = data[j].key+this.decValue;
                    if(this.userInputList[inckey] && this.userInputList[deckey]){
                        data[j].incdec.idvalue = (((this.userInputList[inckey]/this.userInputList[deckey])-1)*100).toFixed(0).toString()+' %';
                    }
                    else{
                        data[j].incdec.idvalue = '';
                    }
                }                
                dataList.push(data[j]);
            }
            updatedTableList[i].data = dataList;
        }
        this.tableList = updatedTableList;
        this.financialInfo.tableList=this.tableList;
        this.isLoaded = false;
    }
}