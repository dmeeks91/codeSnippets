(function () {
    'use strict';
    MyApp.angular.controller('ObservationPageController', ['$scope', '$http', '$timeout', '$q', 'InitService', 'DataService', 'localDBStrategy', 'dbFunctions', 'Offline', '_',
     function ($scope, $http, $timeout, $q, InitService, DataService, localDBStrategy, dbFunctions, Offline, _) {
         //Form Object
         var form = {
             alerts: {
                        'Init': {
                            title: 'Internet Connection Required',
                            msg: 'It looks like this is your first time opening this app on your device. An internet connection is required for the initial load. Please connect to the internet and come back.',
                            btns: [],
                        },
                        'NoAttr': {
                            title: 'No Scored Attributes',
                            msg: 'You must score at least one attribute to proceed with this request.',
                            btns: [],
                        },
                        'Create': {
                            title: 'Confirm Create New',
                            msg: `Are you sure you want to create a new Observation? The current observation will be saved to the device and will not be accesible until you transmit it to the database.`,
                            btns: ['Cancel','Create']
                        },
                        'Delete': {
                            title: 'Confirm Delete Form',
                            msg: `Are you sure you want to delete this form? All data will be permantely deleted. If you wish to create a new observation click 'Cancel'. Then save this form to your device and click 'Create'.`,
                            btns: ['Cancel', 'Delete']
                        },
                        'Transmit': {
                            title: 'Confirm Transmit Form',
                            msg: `Clicking 'Transmit' will send this and all other observations saved on this device to the PGHPO database. You will need to access the observations on the PGHPO website to make any further edits.`,
                            btns: ['Cancel', 'Transmit']
                        },
                     },
             header_1: {
                            ENTERED_DATE: 'sysdate',
                            TIME_STAMP: 'sysdate',
                            STATUS: 'ACTIVE'
                          },
             headerObj: {},
             forceOffline: false,
             OBS_ID: '',
             obsQuestionTypes: [],
             obsTypes: ['ROUTINE', 'PAIRED', 'FOCUSED', 'OUTAGE', 'CONTRACTOR', 'SCHEDULED'],
             ddlOptions: [],
             sites: [],
             slctdSite: 'INNS',
             status: '',
             didClick: {'btn':false, 'sSlct':false, 'rSlide':false},
             tabBtns: {                        

                         'New': {
                                         btn: $('#btnNew'),
                                         init: { offline: true, online: true },
                                         pending: { offline: false, online: false },
                                         saved: { offline: true, online: true },
                                         created: { offline: false, online: false },
                                         deleted: { offline: false, online: false },
                                         transmitted: { offline: true, online: true },
                         },

                         'Save': {
                                        btn: $('#btnSave'),
                                        init: { offline: false, online: false },
                                        pending: { offline: true, online: true },
                                        saved: { offline: false, online: false },
                                        created: { offline: false, online: false },
                                        deleted: { offline: false, online: false },
                                        transmitted: { offline: false, online: false },
                         },

                         'Delete': {
                                        btn: $('#btnDelete'),
                                        init: { offline: false, online: false },
                                        pending: { offline: true, online: true },
                                        saved: { offline: true, online: true },
                                        created: { offline: false, online: false },
                                        deleted: { offline: false, online: false },
                                        transmitted: { offline: false, online: false },
                         },

                         'Transmit': {
                                        btn: $('#btnTransmit'),
                                        init: { offline: false, online: true },
                                        pending: { offline: false, online: false },
                                        saved: { offline: false, online: true },
                                        created: { offline: false, online: true },
                                        deleted: { offline: false, online: false },
                                        transmitted: { offline: false, online: false },
                         }
                      },
             user: {},
             offOnStatusChange: function(forceEnable)
             {
                 var self = this;
                 self.getLocalObsForm().then(function (e)
                 {
                     self.hasData('form').then(function (dataExists)
                     {
                         if (dataExists) {
                             self.changeStatus((self.status === 'initComplete') ? 'init' : self.status, forceEnable);
                         }A
                         else
                         {
                             self.changeStatus('created', forceEnable);
                         }
                     })
                 });
             },
             hasData: function (type) 
             {
                 var self = this,
                     nonZero = ['OBSERVER_NAME', 'OBS_DATE', 'OBS_ID'],
                     dataBool = false,
                     deferred = $q.defer();
                 
                 if (type === 'form' || type === 'both')
                 {
                     $.each(self.headerObj, function (key, value)
                     {
                         if (nonZero.indexOf(key) === -1 && !isNullorEmpty(value)) {
                             //console.log(`${key}: ${value}`);
                             dataBool = true;
                             return false; //this will exit the $.each loop
                         }
                     });
                 }
                 
                 if ((type === 'attr' || type === 'both') && !dataBool)
                 {
                     $.each(self.obsQuestionTypes, function (index, value)
                     {
                         var ctgArry = self.obsQuestionTypes[index]["Categories"],
                             attrArry,
                             attr;

                         for(var i=0; i < ctgArry.length; i++)
                         {
                             attrArry = ctgArry[i]['Attributes'];
                             for (var j=0; j < attrArry.length; j++)
                             {
                                 if (attrArry[j].Score != 'NO')
                                 {
                                     dataBool = true;
                                     break;
                                 }
                             }
                             if (dataBool) i = ctgArry.length;
                         }

                         return !dataBool; //this will exit the $.each loop if (hasAttr)
                     });
                 }

                 deferred.resolve(dataBool);

                 return deferred.promise;
             },
             getAllObs: function()
             {
                 var deferred = $q.defer();

                 localDBStrategy.getAll('obsForm').then(function (data)
                 {
                     deferred.resolve(data);
                 });

                 return deferred.promise;
             },
             getSlctdSite: function () {
                            var formFacility = this.headerObj.FACILITY, //Site value currently entered in the form 
                                userFacility = this.user.FACILITY; //Site associated with current user pulled from DOM AD
                            
                            if (this.slctdSite === "0" || isNullorEmpty(this.slctdSite))
                            {
                                if (!isNullorEmpty(formFacility))
                                {
                                    this.slctdSite = formFacility;
                                }
                                else if (!isNullorEmpty(userFacility))
                                {
                                    this.slctdSite = userFacility;
                                }
                            }
                                
                            if (this.slctdSite === "0") {
                                console.log('Selected Facility: ' + this.slctdSite);
                                console.log('User Facility: ' + userFacility);
                                console.log('Form  Facility: ' + formFacility);
                            }

                            return this.slctdSite;
                           },
             getLocalObsForm: function () {
                            var deferred = $q.defer();
                                this.headerObj = MyApp.fw7.app.formToData('#obsForm');
                                deferred.resolve(this.OBS_ID);
                            return deferred.promise;
                         },
             getIndexedDBObsForm: function () {
                 var self = this,
                     deferred = $q.defer();
                     dbFunctions.getDBObject('obsForm', (self.OBS_ID === '') ? null : self.OBS_ID).then(
                         function (data) {
                             if (data.length === 0) {
                                 self.clearForm().then(function (blankForm) { self.showOnScreen(blankForm.headerObj) }).then(deferred.resolve(), deferred.reject());//.obj
                             }
                             else {
                                 self.setLocalObsForm(data).then(function (dbForm) { self.showOnScreen(dbForm.headerObj) }).then(deferred.resolve(), deferred.reject());//.obj
                             }
                             deferred.resolve
                         });
                 return deferred.promise;
             },
             getServerObjectFromDB: function (objStoreName, keyValue, varName) {
                 var self = this,
                     deferred = $q.defer();

                 dbFunctions.getDBObject(objStoreName, keyValue).then(
                     function (result)
                     {
                         if (result.length != 0)//!= undefined)
                         {
                             self[varName] = (result.obj === undefined) ? result : result.obj;
                             deferred.resolve(result);
                         }
                         else
                         {
                             deferred.resolve(null);
                         }
                     }, deferred.reject);

                 return deferred.promise;
             },
             setLocalObsForm: function (data) {
                 var deferred = $q.defer(),
                     self = this;
                    if (data != undefined)
                     {
                         self.OBS_ID = data.OBS_ID;
                         //self.header_1 = data.obj.header_1;
                         self.headerObj = data.headerObj;//.obj
                         self.obsQuestionTypes = data.questionObj;//.obj
                     }
                    else
                     {
                         self.getLocalObsForm();
                     }
                     deferred.resolve(data);
                 return deferred.promise;
             },
             stringifyInnerObj: function (obj) {
                 //stringify all child objects through recurssion. This step is necessary to handle object on server side
                 var self = this;

                 for (var prop in obj)
                 {
                     if (typeof obj[prop] != 'string')
                     {
                         obj[prop] = this.stringifyInnerObj(obj[prop]);
                     }
                 }

                 return JSON.stringify(obj);
             },
             stringifyObservation: function (obs) {
                 var deferred = $q.defer(),
                     self = this;
                 
                 //Format date strings here using moment.JS instead of on server
                 obs.headerObj.OBS_DAY = dayOfWeek(obs.headerObj.OBS_DATE);
                 obs.headerObj.OBS_DATE = longDate(obs.headerObj.OBS_DATE);
                 obs.ENTERED_DATE = longDate(obs.ENTERED_DATE);
                 obs.TIME_STAMP = longDate(obs.TIME_STAMP);

                 //Convert OBS_TYPE to sync with Oracle Columns
                 $.each(self.obsTypes, function (key, value) {
                     obs.headerObj[`TYPE_${value}`] = (obs.headerObj.OBS_TYPE === value) ? "Y" : "N";
                 });

                 //Delete OBS_TYPE because this col does not exist in DB
                 delete obs.headerObj.OBS_TYPE;

                 //stringify obj so that it can be sent to the server through AJAX
                 var strObj = this.stringifyInnerObj(obs);

                 deferred.resolve(JSON.parse(strObj));

                 return deferred.promise;
             },
             showOnScreen: function (data) {
                 $timeout(function () {
                     MyApp.fw7.app.formFromData('#obsForm', data);
                 },0);
             },
             init: function () {
                 var self = this;
                 self.status = '';
                 self.getIndexedDBObsForm().then(function ()
                 {
                     getSiteList();
                     self.setDDL('departments', 'Department');
                     self.setDDL('jointDepartments', 'Department');
                     self.setDDL('observed_wkgrps', 'Department');
                     self.setDDL('positions', 'Position');
                     self.setDDL('jointPositions', 'Position');
                     self.setDDL('locations', 'Location');
                     self.setDDL('observationTypes', self.obsTypes);
                     self.setDDL('sites', self.sites);

                     MyApp.fw7.app.hidePreloader();
                     $('#page1').show();
                 });                 
             },
             clearForm: function () {
                 var deferred = $q.defer();
                     try
                     {
                         for (var fld in this.headerObj)
                         {
                            this.headerObj[fld] = (fld === 'OBS_DATE' || fld === 'OBSERVER_NAME') ?
                            this.headerObj[fld] : (fld === 'OBSERVER_NAME_2') ? "" : "0";
                         }
                        this.OBS_ID = '';
                        this.obsQuestionTypes = [];
                        deferred.resolve({ OBS_ID: this.OBS_ID, headerObj: this.headerObj, questionObj: this.obsQuestionTypes }); //header_1: this.header_1, obj: { headerObj: this.headerObj, questionObj: this.obsQuestionTypes }
                     }
                     catch(e)
                     {
                         deferred.reject();
                     }                     
                 return deferred.promise;
                },
             clearDependantFields: function (keys) {
                 self = this;
                 //This outer If Statement prevents from running during initialization
                 if (self.slctdSite != "0" && self.slctdSite != self.headerObj.FACILITY) 
                 {
                     self.getLocalObsForm().then(function ()
                     {
                        $.each(keys, function (indx, key) {
                            self.headerObj[key] = "0";
                        });

                        self.showOnScreen(self.headerObj);
                     });   
                 }
             },
             deleteObs: function(objectStoreName, id) {
                 var deferred = $q.defer();
                 
                 localDBStrategy['delete'](objectStoreName, id).then(function (data)
                 {
                     console.log('Observation Deleted');
                     deferred.resolve(true);
                 });

                 return deferred.promise;
             },
             save: function (task) {
                var deferred = $q.defer();
                    self = this;                    
                    dbFunctions.updateDBStore({
                        data: {
                            OBS_ID: self.OBS_ID,
                            headerObj: self.headerObj,
                            questionObj: self.obsQuestionTypes
                        },
                        store: 'obsForm'
                    }).then(
                    function (data) {
                        var msg = (task === 'save') ? 'Observation successfully saved to device.' : 
                                  (task === 'create') ? 'A new observation has been created and is awaiting data entry' : 'Observation successfully deleted from device.';
                        toastr['success'](msg);                        
                        if (task === 'save')
                        {
                            self.setLocalObsForm(data);
                            self.changeStatus('saved', true);
                        }
                        deferred.resolve('saved');
                    });

                    return deferred.promise;
             },
             setDDL: function (key, type) {
                         $scope[key] = {
                             model: null,
                             options: (typeof type === 'string') ? getDDL(type) : type,
                         };
             },             
             enableTabBtn: function (status) {
                                 var enable,
                                     onOff,
                                     btnObj;
                                 //console.log(status);
                                 for (var name in this.tabBtns)
                                 {
                                     btnObj = this.tabBtns[name];
                                     onOff = (Offline.state === 'up') ? 'online' : 'offline';
                                     enable = btnObj[status][onOff];
                                     btnObj.btn.addClass((enable) ? 'active' : 'disabled');
                                     btnObj.btn.removeClass((enable) ? 'disabled' : 'active');
                                 }                 
             },
             modalhtml: function (alert) { 
                 var deferred = $q.defer(),
                     htmlStart = '<div class="picker-modal" ng-controller="ObservationPageController">' +
                                     '<div class="toolbar de-blue">' +
                                         '<div class="toolbar-inner">' +
                                             '<div class="left"></div>' +
                                             '<div class="center">' + alert.title + '</div>' +
                                             '<div class="right"><a href="#" class="close-picker navText">Close</a></div>' +
                                         '</div>' +
                                     '</div>' +
                                     '<div class="picker-modal-inner noBck">' +
                                         '<div class="list-block inset noBck">' +
                                             '<ul>'+
                                                 '<li>' +
                                                     '<p class="qBlock">' + alert.msg + '</p>' +
                                                 '</li>' +
                                             '</ul>',
                      htmlMid = '',
                      htmlEnd =          '</div>' +
                                     '</div>' +
                                  '</div>';
                      
                 if (alert.btns.length > 0)
                 {
                     htmlMid = '<div class="row">' +
                                    '<div class="col-50"></div>' +
                                    '<div class="col-25">' +
                                        '<a href="#" class="button button-big modalBtn close-picker">' + alert.btns[0] + '</a>' +
                                    '</div>' +
                                    '<div class="col-25">' +
                                        `<a href="#" id="modalAction" class="button button-big modalBtn close-picker">${alert.btns[1]}</a>` +
                                    '</div>' +
                                '</div>';
                 }

                 deferred.resolve(htmlStart + htmlMid + htmlEnd);

                 return deferred.promise;
                 
             },
             changeStatus: function (status, forceEnable)
             {
                 var self = this,
                     deferred = $q.defer();
                 if (self.status != status || forceEnable)
                 {
                     self.status = status;
                     if (self.tabBtns.New[status] != undefined) self.enableTabBtn(status);
                 }
                 deferred.resolve(self.status);
                 return deferred.promise;
             }             
         }

         //modal functions
         var modalPopup = function (alert) {
                 if ($$('.picker-modal.modal-in').length > 0) {
                     MyApp.fw7.app.closeModal('.picker-modal.modal-in');
                 }
                 form.modalhtml(alert).then(
                     function (html) {
                         MyApp.fw7.app.pickerModal(html);
                         var hght = $('.picker-modal.modal-in .toolbar').height() + $('.picker-modal.modal-in .list-block').height() + 75;
                         $('.picker-modal.modal-in').height(hght);
                         $('#modalAction').on('click', function(e)
                         {
                             e.preventDefault();
                             modalConfirm(e.target.innerHTML);
                         })
                     });     
         }             

         var modalConfirm = function (type) {
             var deferred = $q.defer();
             try
             {
                form.didClick.btn = true;
                switch (type)
                     {
                        case 'Create':
                            form.clearForm().then(function (blankForm)
                            {
                                form.save('create').then(function () {
                                    form.getIndexedDBObsForm().then(function () {
                                        form.changeStatus('created', true);
                                    })                                    
                                });
                            });
                            break;
                        case 'Delete':
                            form.deleteObs('obsForm', form.OBS_ID).then(function()
                            {
                                form.clearForm().then(function (blankForm) {
                                    form.save('delete').then(function () {
                                        form.getIndexedDBObsForm().then(function () {
                                            form.changeStatus('deleted', true);
                                        })
                                    });
                                });                                    
                            });                          
                            break;
                        case 'Transmit':
                        form.getAllObs().then(function (data)
                        {
                            for (var obs in data) {
                                form.stringifyObservation(data[obs]).then(function (strObs) {
                                    DataService.transmit(strObs).then(function (transmittedData) {
                                        console.log(transmittedData);
                                    });
                                });
                            }
                        });
                        break;
                    }
                deferred.resolve({'type':type, error: false});
             }
             catch (e)
             {
                 deferred.reject();
             }
             
            return deferred.promise;
         }

         //Call back functions
         var onGetUserDetails = function (data) {
             var deferred = $q.defer();

             if (Offline.state === 'up' && !form.forceOffline)
             {
                 form.user = JSON.parse(data.data.substring(data.data.indexOf("{"), data.data.lastIndexOf("}") + 1));
                 //upload userDetails to indexedDB so that accessible while offline
                 dbFunctions.updateDBStore({ data: form.user, store: 'userDetails' }).then(
                     function (data) {
                         form.headerObj.OBSERVER_NAME = data.FULLNAME;
                         form.showOnScreen(form.headerObj);
                         deferred.resolve(data);
                     });
             }
             else
             {                 
                 form.getServerObjectFromDB('userDetails', null, 'user').then(
                      function (e) {
                          if (!isNullorEmpty(e))
                          {
                            form.init();
                            deferred.resolve(e);
                          }
                          else
                          {
                            deferred.resolve('No Data');
                          }
                      });
             }
             
             return deferred.promise;
         }

         var onGetDDL = function (data) {
             var deferred = $q.defer();

             if (Offline.state === 'up' && !form.forceOffline)
             {
                 form.ddlOptions = JSON.parse(data.data.substring(data.data.indexOf("{"), data.data.lastIndexOf("}") + 1));
                 //upload ddlOptions to indexedDB so that accessible while offline
                 dbFunctions.updateDBStore({ data: { obj: form.ddlOptions, NAME: 'ddlOptions' }, store: 'serverObjects' }).then(
                     function (e) {
                         form.init();
                         deferred.resolve(e);
                     });
             }
             else
             {
                 form.getServerObjectFromDB('serverObjects', 'ddlOptions', 'ddlOptions').then(
                     function (e)
                     {
                         if (!isNullorEmpty(e))
                         {
                             form.init();
                             deferred.resolve(e);
                         }
                         else
                         {
                             deferred.resolve('No Data')
                         }
                     });
             }

             return deferred.promise;
         }

         var onError = function (data) {
             console.log('error...');
             console.log(data);
         }

         function getSiteList() {
             for (var site in form.ddlOptions) {
                 if (form.sites.indexOf(site) === -1)
                 {
                     form.sites.push(site);
                 }
             }
         }

         function getDDL(type) {
             var site = form.getSlctdSite();
             try {
                 return form.ddlOptions[site][type];
             }
             catch (ex) {
                 return [];
             }
         }

         //Scope Functions
         $scope.onSelectSite = function (col) {
             form.slctdSite = $scope.sites.model;
             form.setDDL('locations', 'Location');
             form.clearDependantFields(['LOCATION', 'OBSERVED_WKGRP']);
             //form.setLocalObsForm();
         }

         $scope.onSelectType = function () {
             var type = $scope.observationTypes.model;
             form.headerObj.OBS_TYPE = type;
             if (type == "PAIRED") {
                 $('#jObsTitle').show();
                 $('#jObsBlock').show();                 
             }
             else {
                 $('#jObsTitle').hide();
                 $('#jObsBlock').hide();
             }
             if (form.didClick.sSlct)
             {                 
                 form.showOnScreen(form.headerObj);
             }
         }

         $scope.selectPage = function (title) {
             DataService.dispatchEvent('detailSelected', { 'title': title, 'questionObj': form.obsQuestionTypes });
         }

         $scope.saveObservation = function () {
             form.getLocalObsForm().then(function () { form.save('save') });
         }

         $scope.deleteObservation = function ()
         {
             modalPopup(form.alerts['Delete']);
         }

         $scope.newObservation = function () {
             //modalPopup(form.alerts['Create']);
             form.hasData('attr').then(function (dataExists) {
                 modalPopup(form.alerts[(dataExists) ? 'Create' : 'NoAttr']);
             });
         }

         $scope.transmitObservation = function()
         {
             form.hasData('attr').then(function (dataExists)
             {
                 modalPopup(form.alerts[(dataExists) ? 'Transmit' : 'NoAttr']);
             });
         }

         $scope.behavioralTypes = ['Human Performance Defenses', 'Industrial Safety Behaviors'];

         $$('.smart-select').on('click', function (e) {
             form.didClick.sSlct = true;
         });

         $$('.smart-select').on('change', function (e) {
             if(form.didClick.sSlct)
             {
                 form.changeStatus('pending', false).then(function ()
                 {
                     form.didClick.sSlct = false;
                 });
                 
             }
         });
         
         $$('#slider-obs-duration').on('change', function (e) {
             if (form.didClick.rSlide)
             {
                 form.changeStatus('pending', false);
                 form.didClick.rSlide = false;
             }
         })

         $$('#slider-obs-duration').on('touchend', function (e) {
             form.didClick.rSlide = true;
         })

         //Startup Functions
         var getUserDetails = function ()
         {
             var deferred = $q.defer();

             //get userDetail object
             DataService.getUserDetails().then(
                 function (data) {
                     onGetUserDetails(data).then(
                         function (data) {
                             deferred.resolve(data);
                         });
                 }, onError);

            return deferred.promise;
         }

         var getDDLOptions = function ()
         {
             var deferred = $q.defer();

             DataService.getDDLOptions().then(
                 function (data) {
                     onGetDDL(data).then(
                         function (data) {
                             deferred.resolve(data);
                         });
                 }, onError);

             return deferred.promise;
         }

         var startUp = function () {
             var deferred = $q.defer();
             getUserDetails().then(
                function (msg) {
                    if (msg === 'No Data') {
                        console.log(msg);
                        setTimeout(function () {
                            MyApp.fw7.app.hidePreloader();
                            modalPopup(form.alerts['Init']);
                        }, 1500);                        
                    }
                    else {
                        getDDLOptions().then(
                            function (msg) {
                                if (msg === 'No Data') {
                                    console.log(msg);
                                    setTimeout(function () {
                                        MyApp.fw7.app.hidePreloader();
                                        modalPopup(form.alerts['Init']);
                                    }, 1500);
                                }
                                else {
                                    if (form.status != 'init')
                                    {                                        
                                        //$('.modal-overlay').hide();
                                        form.hasData('form').then(function(dataExists)
                                        {                                            
                                            if (dataExists)
                                            {
                                                form.changeStatus('init', false);
                                            }
                                            {
                                                form.changeStatus('created', false);
                                            }
                                        })
                                    }
                                    deferred.resolve();
                                }
                            });
                    }
                });
             return deferred.promise;
         }

         //Event Listeners
         DataService.addEventListener('jointObserverSelected', function (person) {
             $timeout(function () {
                 form.headerObj.OBSERVER_NAME_2 = person.Name;
                 form.headerObj.OBSERVER_PAIRED_EID = person.EID;
                 form.headerObj.OBS_TYPE = "PAIRED";
                 form.showOnScreen(form.headerObj);
             }, 0);
         })

         DataService.addEventListener('attributeObjectUpdated', function (e) {
             $timeout(function () {
                 form.obsQuestionTypes = e;
                 form.enableTabBtn('pending');
             }, 0);
         });

         InitService.addEventListener('ready', function () {
             console.log('ObservationPageController: ok, DOM ready');
             MyApp.fw7.app.showPreloader(); 
             toastr.options = {
                 "closeButton": false,
                 "debug": false,
                 "newestOnTop": false,
                 "progressBar": false,
                 "positionClass": "toast-bottom-center",
                 "preventDuplicates": true,
                 "onclick": null,
                 "showDuration": "300",
                 "hideDuration": "1000",
                 "timeOut": "2500",
                 "extendedTimeOut": "1000",
                 "showEasing": "swing",
                 "hideEasing": "linear",
                 "showMethod": "fadeIn",
                 "hideMethod": "fadeOut"
             };
             MyApp.fw7.app.calendar({
                 input: '#calendar-obs-date',
                 value: [Date()],
                 dateFormat: "mm/dd/yyyy",
             });
             startUp().then(function ()
             {
                 $('.modal-overlay').hide();
                 setTimeout(function () {
                     form.changeStatus('initComplete', false);
                 },50);
             }).then(function () {
                 if (form.forceOffline && !$('#offline-simulate-check')[0].checked)
                 {
                     $('#offline-simulate-check').click();
                 }
             });
         });

         Offline.on('down', function (e) {
             if (Offline.state === 'down')
             {
                 setTimeout(function ()
                     {
                     form.offOnStatusChange(true);
                     }, 50);
             }   
         });

         Offline.on('up', function (e) {
             if (Offline.state === 'up')
             {
                 setTimeout(function () {
                     form.offOnStatusChange(true);
                 }, 50);
             }
         });

     }]);
}());