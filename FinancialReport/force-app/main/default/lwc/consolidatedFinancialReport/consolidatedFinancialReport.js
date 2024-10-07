import { api, LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getCAMReportMdt from '@salesforce/apex/FinancialReportController.getCAMReportMdt';
import getRelatedFiles from '@salesforce/apex/FinancialReportController.getRelatedFiles';
import NUMBER_OF_YEARS from '@salesforce/label/c.Years_Financial_Report';

export default class ConsolidatedFinancialReport extends LightningElement {
    @api recordId;
    @track reportMap;
    numberOfYears = 4;
    currentYear;
    @track tableList = [];
    @track userInputList = [];
    @track formulas = [];
    @track formulaLitMap = [];
    @track auditInfo = [];
    @track applicantAuditInfo = [];
    @track financialInfo = {};
    @track auditHeaders = [];
    @track auditMap = [];
    @track orderMap = [];
    @track auditedList = [];
    @track errorList = [];
    @track firstYearOptions = [];
    @track secondYearOptions = [];
    @track applicantInfo = [];
    isCalculated = false;
    isUpdate = false;
    inc;
    dec;
    isEdit = false;
    isLoaded = true;
    incdeclabel = 'YoY';
    isYoY = false;
    incValue;
    decValue;
    colspan;
    label = {
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
        if (month < 4) {
            this.currentYear = this.currentYear - 1;
        }
        this.getFileData();
    }

    //audit json
    auditData() {
        let auditInfo = [];
        let startDateList = [];
        let endDateList = [];
        let finTypeList = [];
        this.auditHeaders = ['Start Date', 'End Date', 'Financial Type'];
        for (let year = this.currentYear; year >= (this.currentYear - this.numberOfYears); year--) {
            let value = '';
            if (this.userInputList[year] != null) {
                value = this.userInputList[year];
            }
            startDateList.push('01/04/' + String(year));
            endDateList.push('31/03/' + String(year + 1));
            finTypeList.push({ key: String(year), value: value, isDisabled: false });
            this.firstYearOptions.push({ label: String(year), value: String(year) });
            this.secondYearOptions.push({ label: String(year), value: String(year) });
        }
        this.colspan = this.firstYearOptions.length + 2;
        this.auditInfo.push({ label: 'Start Date', audata: startDateList, isPicklist: false, style: 'datatable-orange' });
        this.auditInfo.push({ label: 'End Date', audata: endDateList, isPicklist: false, style: 'datatable-orange' });
        this.auditInfo.push({ label: 'Financial Type', audata: finTypeList, isPicklist: true, style: '' });
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
                        if (rows[j].Display_Type__c == 'Currency') {
                            display = true;
                        }
                        else {
                            display = false;
                        }
                        if (rows[j].Field_Type__c == 'Formula') {
                            formulas.set(rows[j].JSON_Key__c, rows[j].Formula__c);
                            disableClass = disableClass + ' datatable-orange';
                            disable = true;
                        }
                        let eachRow = [];
                        for (let year = this.currentYear; year >= (this.currentYear - this.numberOfYears); year--) {
                            let value = '';
                            if (this.userInputList[rows[j].JSON_Key__c + year] != null) {
                                value = this.userInputList[rows[j].JSON_Key__c + year].toFixed(2);
                            }
                            eachRow.push({ label: 'FY ' + year, value: value, key: rows[j].JSON_Key__c + year, disable: disable, required: false, year: year });
                        }
                        let incdec = {};
                        incdec.idkey = i + 'incdec';
                        incdec.idvalue = '';
                        if (this.inc && this.dec) {
                            let inckey = rows[j].JSON_Key__c + this.inc;
                            let deckey = rows[j].JSON_Key__c + this.dec;
                            if (this.userInputList[inckey] && this.userInputList[deckey]) {
                                incdec.idvalue = (((this.userInputList[inckey] / this.userInputList[deckey]) - 1) * 100).toFixed(0).toString() + ' %';
                            }
                        }
                        dataList.push({ mandatory: rows[j].Mandatory__c, disclass: disableClass, key: rows[j].JSON_Key__c, label: rows[j].Row_Label__c, display: display, input: rows[j].Field_Type__c, yeardata: eachRow, incdec: incdec });
                    }
                    let incdeclabel = 'YoY';
                    if (this.inc && this.dec) {
                        incdeclabel = 'YoY ' + this.inc + ' / ' + this.dec;
                    }
                    this.tableList.push({ label: i, data: dataList, headerList: headerList, order: this.orderMap[i], incdeclabel: incdeclabel });
                }
                this.formulas = formulas;
                this.tableList.sort(function (a, b) {
                    return ((a.order < b.order) ? -1 : ((a.col1 == b.col1) ? 0 : 1));
                });
                this.financialInfo.tableList = this.tableList;
                this.auditData();
                this.financialInfo.auditList = this.auditInfo;
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
            getRelatedFiles({ parentId: this.recordId })
                .then(result => {
                    if (result != undefined && result != null) {
                        let rowDataList = [];
                        for (let r in result) {
                            let response = JSON.parse(result[r]);
                            let tableList = response.tableList;
                            if (this.applicantAuditInfo.length <= 0) {
                                this.applicantAuditInfo = response.auditList;
                            }
                            this.applicantInfo.push({ tableList: response.tableList, auditList: response.auditList, applicantname: r });
                            for (let i in tableList) {
                                let data = tableList[i].data;
                                for (let j in data) {
                                    let row = data[j].yeardata;
                                    for (let k in row) {
                                        rowDataList.push(row);
                                        if (row[k].value) {
                                            if (this.userInputList[row[k].key]) {
                                                this.userInputList[row[k].key] = Number(row[k].value) + Number(this.userInputList[row[k].key]);
                                            }
                                            else {
                                                this.userInputList[row[k].key] = Number(row[k].value);
                                            }
                                            this.userInputList[r + row[k].key] = Number(row[k].value);
                                        }
                                    }
                                }
                            }
                        }
                        for (let key in this.applicantAuditInfo) {
                            let audit = this.applicantAuditInfo[key].audata;
                            if (this.applicantAuditInfo[key].label == 'Financial Type') {
                                for (let dt in audit) {
                                    if (audit[dt].value) {
                                        this.userInputList[audit[dt].key] = audit[dt].value;
                                        this.auditMap.push(audit[dt].key);
                                    }
                                }
                            }
                        }
                    }
                    if (this.auditMap.length >= 2) {
                        this.inc = String(this.auditMap[0]);
                        this.dec = String(this.auditMap[1]);
                    }
                    this.getTableMetadata();
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

    handleYoY() {
        this.isYoY = true;
    }
    closeModal() {
        this.isYoY = false;
    }
    yoyChange(event) {
        let name = event.target.name;
        let value = event.target.value;
        console.log(name);
        console.log(value);
        if (name == 'inc') {
            this.incValue = value;
        }
        else if (name == 'dec') {
            this.decValue = value;
        }
    }
    submitDetails() {
        this.isLoaded = true;
        let updatedTableList = this.tableList;
        this.isYoY = false;
        for (let i in updatedTableList) {
            if (this.incValue && this.decValue) {
                updatedTableList[i].incdeclabel = 'YoY ' + this.incValue + ' / ' + this.decValue;
            }
            let data = updatedTableList[i].data;
            let dataList = [];
            for (let j in data) {
                if (this.incValue && this.decValue) {
                    let inckey = data[j].key + this.incValue;
                    let deckey = data[j].key + this.decValue;
                    if (this.userInputList[inckey] && this.userInputList[deckey]) {
                        data[j].incdec.idvalue = (((this.userInputList[inckey] / this.userInputList[deckey]) - 1) * 100).toFixed(0).toString() + ' %';
                    }
                    else {
                        data[j].incdec.idvalue = '';
                    }
                }
                dataList.push(data[j]);
            }
            updatedTableList[i].data = dataList;
        }
        this.tableList = updatedTableList;
        this.financialInfo.tableList = this.tableList;
        let applicantinfo = this.applicantInfo;
        for (let app in applicantinfo) {
            let tableList = applicantinfo[app].tableList;
            let appname = applicantinfo[app].applicantname;
            for (let a in tableList) {
                if (this.incValue && this.decValue) {
                    tableList[a].incdeclabel = 'YoY ' + this.incValue + ' / ' + this.decValue;
                }
                let data = tableList[a].data;
                let dataList = [];
                for (let b in data) {
                    if (this.incValue && this.decValue) {
                        let inckey = appname + data[b].key + this.incValue;
                        let deckey = appname + data[b].key + this.decValue;
                        if (this.userInputList[inckey] && this.userInputList[deckey]) {
                            data[b].incdec.idvalue = (((this.userInputList[inckey] / this.userInputList[deckey]) - 1) * 100).toFixed(0).toString() + ' %';
                        }
                        else {
                            data[b].incdec.idvalue = '';
                        }
                    }
                    dataList.push(data[b]);
                }
                tableList[a].data = dataList;
            }
            applicantinfo[app].tableList = tableList;
        }
        this.applicantInfo = applicantinfo;
        this.isLoaded = false;
    }

}