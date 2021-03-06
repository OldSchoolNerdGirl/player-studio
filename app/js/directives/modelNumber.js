'use strict';
var DirectivesModule = angular.module('KMC.directives');
DirectivesModule.directive('modelNumber', [ 'menuSvc', function(menuSvc) {
        return {
            templateUrl: 'template/formcontrols/modelNumber.html',
            replace: true,
            restrict: 'EA',
            priority:10,
            scope: {
                model: '=',
                helpnote: '@',
                label: '@',
                'require': '@',
                'strModel': '@model'
            },
            controller: ['$scope', '$element', '$attrs', function($scope, $element, $attrs) {
                $scope.defaults = {
                    initvalue: parseInt($attrs['initvalue']) || 0,
                    from: parseInt($attrs['from']) || 0,
                    to: parseInt($attrs['to']) || 1000,
                    stepSize: parseInt($attrs['stepsize']) || 1,
                    readonly: false  /// note that a input can be made readonly
                };
                $scope.inputForm = {};
                if (typeof $scope.model != 'number' && !(typeof $scope.model == 'string' && parseInt($scope.model))) {

                    $scope.model = ($scope.defaults['initvalue'] || 0);
                }
                return $scope;
            }]
//           , link: function ($scope) {
////                $scope.isDisabled = false;
////                $scope.$on('disableControls', function () {
////                    $scope.isDisabled = true;
////                });
////                $scope.$on('enableControls', function () {
////                    $scope.isDisabled = false;
////                });
//            }
        };
    }
    ]).directive('numberInput', ['$timeout', '$q', function($timeout, $q) {
        return {
            require: ['^modelNumber', 'ngModel', '?^playerRefresh'],
            restrict: 'A',
            priority:500,
            scope: true,
            templateUrl: 'template/formcontrols/numberInput.html',
            link: function($scope, $element, $attrs, controllers) {
                var modelScope = controllers[0];
                var ngModelCtrl = controllers[1];
                var inputControl = $element.find('input');
                modelScope.modelCntrl = ngModelCtrl;
                modelScope.inputForm = $scope.inputForm;
                var prController = (controllers[2]) ? controllers[2] : null;
                var timeVar = null;
                if (prController) {
                    prController.setUpdateFunction(function(prScope, element) {
                        inputControl.on('change softChange', function() {
                                if (timeVar) {
                                    $timeout.cancel(timeVar);
                                }
                                timeVar = $timeout(function() {
                                    prScope.$emit('controlUpdateAllowed', prScope.prModel.key);
                                     timeVar = null;
                                }, 1000);
                            }
                        );
                    });
                }
                if (typeof $scope.model != 'number' && !(typeof $scope.model == 'string' && parseInt($scope.model))) {

                    ngModelCtrl.$setViewValue($scope.defaults['initvalue'] || 0);
                }
                inputControl.on('blur change', function() {
                    var inValue = inputControl.val();
                    if (inValue === '') {
                        $scope.$apply(function() {
                            ngModelCtrl.$setViewValue($scope.defaults['initvalue'] || 0);
                        });
                    }
                    else {
                        inValue = parseInt(inValue);
                        if ($scope.passValidation(inValue)) {
                            $scope.$apply(function() {
                                change(inValue);
                            });
                        }
                    }
                });
                inputControl.on('keydown', function(e) { // modern browsers will do this on their own but we also and support old browsers..
                        if (e.keyCode == 38 || e.keyCode == 40) {
                            e.preventDefault();
                            $scope.$apply(function() {
                                if (e.keyCode == 38) {
                                    $scope.increment();
                                }
                                else {
                                    $scope.decrement();
                                }
                            });
                        }
                    }
                );
                ngModelCtrl.$parsers.push(function(value) {
                    return modelScope.model = value;
                });

                var change = function(value) {
                    inputControl.trigger('softChange');
                    ngModelCtrl.$setViewValue(value);
                };
                $scope.increment = function() {
                    var resultVal = ngModelCtrl.$viewValue + $scope.defaults.stepSize;
                    if (resultVal < $scope.defaults.to)
                        change(resultVal);
                    else change($scope.defaults.to);
                };
                $scope.passValidation = function(resultVal) {
                    if (typeof resultVal == 'number' && resultVal > $scope.defaults.from && resultVal < $scope.defaults.to) return true;
                };
                $scope.decrement = function() {
                    var resultVal = ngModelCtrl.$viewValue - $scope.defaults.stepSize;
                    if (resultVal > $scope.defaults.from)
                        change(resultVal);
                    else change($scope.defaults.from);
                };
            }
        };
    }
    ])
;