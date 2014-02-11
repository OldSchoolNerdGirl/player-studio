'use strict';

/* Controllers */

angular.module('KMCModule').controller('PlayerEditCtrl',
    ['$scope', 'PlayerData', '$routeParams', '$filter', 'menuSvc', 'PlayerService', 'apiService', 'localStorageService','$timeout',
        function($scope, PlayerData, $routeParams, $filter, menuSvc, PlayerService, apiService, localStorageService, $timeout) {
            $scope.newPlayer = !$routeParams.id;
            $scope.data = PlayerData;
            // save data copy for reverting changes
            $scope.masterData = angular.copy($scope.data);

            // handle data changes
            $scope.refreshNeeded = false;
            $scope.$on("dataChanged", function(event, message){
                if (message.refresh == "true"){
                    $scope.refreshNeeded = true;
                }else{
                    if (typeof message.refresh != "undefined" && message.refresh.indexOf(".")!=-1)
                        PlayerService.setKDPAttribute(message.refresh, message.data);
                }
                if (message.refresh == "aspectToggle"){
                    $('#spacer').toggleClass('narrow');
                }else{
                    $scope.isDirty = true;
                }
            });
            // refreshNeededEvent send from child scope (editPageDataCntrl) upon player refresh
            $scope.$on("refreshNeededEvent", function(event, needed){
                $scope.refreshNeeded = needed;
            });

            // debug info for adding "debug" to the url
            $scope.debug = $routeParams.debug;
            $scope.getDebugInfo = function(partial) {
                if (!partial)
                    return $scope.data;
                else
                    return $scope.data[partial];
            };

            // isDirty is used to notify the user if there are unsaved changes before exiting the edit page
            $scope.isDirty = $scope.newPlayer ? true : false;
            // playerSavedEvent is send from child scope (editPageDataCntrl) upon player save
            $scope.$on("playerSavedEvent", function(event, saved){
                $scope.isDirty = false;
            });

            // load user entries list
            $scope.userEntriesList = [];
            apiService.listMedia().then(function(data) {
                $scope.userEntries = data;
                angular.forEach($scope.userEntries.objects, function (value) {
                    $scope.userEntriesList.push({'id': value.id, 'text': value.name});
                });
            });

            $scope.settings = {};

// set tags
            $scope.tags = [];
// all of the next block is just to show how to push into the tags autocomplete/dropdown the list of available tags should be loaded this way instead,
// the model tags of the player are actually set properly from the ng-model of the tags directive and are not needed here
            if (typeof $scope.data.tags != "undefined" && $scope.data.tags) { //can also be null
                var tags = typeof $scope.data.tags == "string" ? $scope.data.tags.split(",") : $scope.data.tags;
                for (var i = 0; i < tags.length; i++)
                    $scope.tags.push({id: tags[i], text: tags[i]});
            }
//registers the tags to be available to the directive
            menuSvc.registerAction('getTags', function() {
                return $scope.tags;
            });
            menuSvc.registerAction('listEntries', function() { // those should be the first 20...
                return $scope.userEntriesList;
            });
            menuSvc.registerAction('queryEntries', function(query) {
                var data = {results: []};
                console.log(query.term);
                if (query.term) {
// here you should do some AJAX API call with the query term and then()...
                    angular.forEach($scope.userEntriesList, function(item, key) {
                        if (query.term.toUpperCase() === item.text.substring(0, query.term.length).toUpperCase()) {
                            data.results.push(item);
                        }
                    });
                    return query.callback(data);
                }
                else
                    return query.callback({results: $scope.userEntriesList});

            });

            if (parseFloat($scope.data.version) < PlayerService.getRequiredVersion()) {
                menuSvc.registerAction('update', function() {
                    PlayerService.playerUpdate($scope.data);
                });
            }
            $scope.settings.previewEntry = ( PlayerService.getPreviewEntry()) ? PlayerService.getPreviewEntry() : $scope.userEntriesList[0]; //default entry
            $scope.$watch('settings.previewEntry.id', function(newVal, oldVal) {
                if (newVal != oldVal) {
                    PlayerService.setPreviewEntry($scope.settings.previewEntry);
                    PlayerService.renderPlayer();
                }
            });
            $(document).ready(function() {
                $scope.masterData = angular.copy($scope.data);
                // get the preview entry
                PlayerService.setPreviewEntry($scope.settings.previewEntry);
            });
        }
    ]);

angular.module('KMCModule').controller('editPageDataCntrl', ['$scope', 'PlayerService', 'apiService', '$modal', '$location', 'menuSvc', 'localStorageService', function($scope, playerService, apiService, $modal, $location, menuSvc, localStorageService) {
    var filterData = function(copyobj) {
        angular.forEach(copyobj, function(value, key) {
            if (angular.isObject(value)) {
                if (typeof value._featureEnabled == 'undefined' || value._featureEnabled === false) {
                    delete copyobj[key];
                }
                else {
                    filterData(value);
                }
            } else {
                if (key == "_featureEnabled") {
                    delete copyobj[key];
                }
            }
        });
        return copyobj;
    };
    $scope.refreshPlayer = function() {
        $scope.$emit("refreshNeededEvent",false);
        playerService.renderPlayer();
    };
    $scope.save = function() {
        playerService.savePlayer($scope.data).then(function(value) {
                // cleanup
                menuSvc.menuScope.playerEdit.$setPristine();
                $scope.masterData = value;
                localStorageService.remove('tempPlayerID');
                // if this is a new player - add it to the players list
                if ($scope.newPlayer) {
//                            prevent the list controller from using the cache the next time the list loads
                    apiService.setCache(false);
                }
                $scope.$emit("playerSavedEvent",true);
                // TODO: replace with floating success message that will disappear after few seconds
                $modal.open({ templateUrl: 'template/dialog/message.html',
                    controller: 'ModalInstanceCtrl',
                    resolve: {
                        settings: function() {
                            return {
                                'title': 'Save Player Settings',
                                'message': 'Player Saved Successfully',
                                buttons: [
                                    {result: true, label: 'OK', cssClass: 'btn-primary'}
                                ]
                            };
                        }
                    }
                });
            },
            function(msg) {
                $modal.open({ templateUrl: 'template/dialog/message.html',
                    controller: 'ModalInstanceCtrl',
                    resolve: {
                        settings: function() {
                            return {
                                'title': 'Player save failure',
                                'message': msg
                            };
                        }
                    }
                });
            }

        )
        ;

    };
    $scope.$watch(function() {
        if (typeof menuSvc.menuScope.playerEdit != 'undefined') {
            if (menuSvc.menuScope.playerEdit.$error) {
                return menuSvc.menuScope.playerEdit.$error;

            }
        }
    }, function(obj, oldVal) {
        if (obj != oldVal) {
            $scope.validationObject = obj;
        }

    });
    $scope.cancel = function() {
        if (!$scope.isDirty) {
            $location.url('/list');
        }
        else {
            var modal = $modal.open(
                { templateUrl: 'template/dialog/message.html',
                    controller: 'ModalInstanceCtrl',
                    resolve: {
                        settings: function() {
                            return {
                                'title': 'Navigation confirmation',
                                message: 'You are about to leave this page without saving, are you sure you want to discard the changes?'
                            };
                        }

                    }});
            modal.result.then(function(result) {
                if (result) {
                    $location.url('/list');
                }
            });
        }
    };
    $scope.saveEnabled = function() {
//instead of using the form dirty state we compare to the master copy.
        if (typeof menuSvc.menuScope.playerEdit != 'undefined') {
            if (menuSvc.menuScope.playerEdit.$valid)
                return !angular.equals($scope.data, $scope.masterData);
            else
                return false;
        }
    };


}
])
;