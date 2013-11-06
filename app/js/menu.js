'use strict';
/* Menu */
var KMCMenu = angular.module('KMC.menu', []);
KMCMenu.factory('menuSvc', ['editableProperties', function (editableProperties) {
        var menudata = null;
        var promise = editableProperties
            .success(function (data) {
                menudata = data;
            });
        var menuSVC = {
            promise: promise,
            menuScope: {},
            get: function () {
                return menudata;
            },
            menuEvent: 0,
            setMenu: function (setTo) {
                menuSVC.menuEvent++;
                    menuSVC.menuScope.$parent.$broadcast('menuChange', setTo);
            },
            buildMenuItem: function (item, targetMenu, BaseData, parentMenu) {
                var originAppendPos = angular.element(targetMenu).find('ul[ng-transclude]:first');
                if (originAppendPos.length < 1)
                    originAppendPos = targetMenu;
                switch (item.type) {
                    case  'menu':
                        var originModel = angular.element(targetMenu).attr('model') ? angular.element(targetMenu).attr('model') : BaseData;
                        var parentLabel = (parentMenu) ? parentMenu.label : 'Top';
                        var parent = writeFormElement(item, '<menu-level pagename="' + item.model + '" parent-menu="' + parentLabel + '"/>', originAppendPos, originModel);
                        var modelStr = originModel + '.' + item.model;
                        for (var j = 0; j < item.children.length; j++) {
                            var subitem = item.children[j];
                            switch (subitem.type) {
                                case 'checkbox' :
                                    writeFormElement(subitem, '<model-checbox/>', parent, modelStr);
                                    break;
                                case 'select' :
                                    writeFormElement(subitem, '<model-select/>', parent, modelStr);
                                    break;
                                case 'color' :
                                    writeFormElement(subitem, '<model-color/>', parent, modelStr);
                                    break;
                                case 'number':
                                    writeFormElement(subitem, '<model-number/>', parent, modelStr);
                                    break;
                                case 'text':
                                    writeFormElement(subitem, '<model-text/>', parent, modelStr);
                                    break;
                                case 'menu':
                                    menuSVC.buildMenuItem(subitem, parent, BaseData, item);
                                    break;
                            }
                        }
                        return parent;
                        break;
                    case 'select' :
                        return writeFormElement(item, '<model-select/>', originAppendPos);
                        break;
                    case 'checkbox' :
                        return writeFormElement(item, '<model-checbox/>', originAppendPos);
                        break;
                    case 'color' :
                        return writeFormElement(item, '<model-color/>', originAppendPos);
                        break;
                    case 'text' :
                        return  writeFormElement(item, '<model-text/>', originAppendPos);
                        break;
                    case 'number':
                        return writeFormElement(item, '<model-number/>', originAppendPos);
                        break;
                }
                function writeFormElement(item, directive, appendTo, parentModel) {
                    var elm = angular.element(directive);
                    angular.forEach(item, function (value, key) {
                        if (key != 'model' && (typeof value == 'string' || typeof value == 'number')) {
                            elm.attr(key, value);
                        } else {
                            if (key == 'options' && typeof value == 'object')
                                if (Array.isArray(value))
                                    elm.attr(key, JSON.stringify(value));
                        }
                    });
                    if (typeof parentModel != "undefined") {
                        var subModelStr = parentModel + '.' + item.model;
                        elm.attr('model', subModelStr);
                    }
                    else {
                        elm.attr('model', BaseData + '.' + item.model);
                    }
                    if (item.type != 'menu')
                        elm = $('<li/>').html(elm);
                    return (elm).appendTo(appendTo);
                }
            }
        };
        return menuSVC;
    }]).directive('navmenu', ['menuSvc' , function (menuSvc) {
        return  {
            template: "<nav id='mp-menu'>" +
                "<div id='mp-inner'>" +
                "<div id='mp-base' class='mp-level'>" +
                "<ul ng-transclude=''></ul>" +
                "</div>" +
                "</div>" +
                "</nav>",
            replace: true,
            restrict: 'E',
            scope: {data: '='},
            transclude: true,
            compile: function (tElement) {
                var BaseData = 'data';
                var menuJsonObj = menuSvc.get(); // gets the  editableProperties json
                var menuList = tElement.find('ul[ng-transclude]:first');
                angular.forEach(menuJsonObj, function (value) {
                    menuSvc.buildMenuItem(value, menuList, BaseData);
                });
                return function ($scope, $element) {
                    //open first level
                    $element.find('#mp-base >ul > li:first > div.mp-level').addClass('mp-level-open');
                }
            },
            controller: function ($scope, $element, $attrs) {
                menuSvc.menuScope = $scope;
            }

        }
    }]).controller('menuSearchCtl',function ($scope, menuSvc) {
        var menuObj = menuSvc.get();
        $scope.menuData = [];
        var getLabels = function (obj) {
            angular.forEach(obj, function (value, key) {
                $scope.menuData[key] = value.label;
                if (value.children) {
                    getLabels(value.children);
                }
            });
        };
        getLabels(menuObj);
        $scope.searchMenuFn = function (value) {
            //TODO: move to search page by result
        }
    }).
    directive('menuLevel', ['menuSvc', function (menuSvc) {
        return  {
            template: "<li>" +
                "<a class='menu-level-trigger' data-ng-click='openLevel()'>{{label}}</a>" +
                "<div class='mp-level'>" +
                "<a class='mp-back' ng-click='goBack()' ng-show='isOnTop'>Back to {{parentMenu}}</a>" +
                "<h2>{{label}}</h2>" +
                "<span class='levelDesc'>{{description}}</span>" +
                "<ul ng-transclude=''></ul>" +
                "</div>" +
                "</li>",
            replace: true,
            restrict: 'E',
            controller: function ($scope) {
                $scope.goBack = function () {
                    $scope.isOnTop = false;
                }
                $scope.openLevel = function (arg) {
                    if (typeof arg == 'undefined')
                        $scope.isOnTop = true;

                    else {
                        if (arg == $scope.pagename) {
                            $scope.isOnTop = true;
                        }
                        else {
                            $scope.isOnTop = false;
                        }
                    }
                }
                $scope.isOnTop = false;
            },
            link: function ($scope, $element) {
                $scope.$on('menuChange', function (event, arg) {
                    $scope.openLevel(arg);
                });
                $scope.$watch('isOnTop', function (newVal, oldVal) {
                    if (newVal != oldVal) {
                        if (newVal) { // open
                            $element.parents('.mp-level:first').addClass('mp-level-in-stack');
                            $element.children('.mp-level').addClass('mp-level-open');
                        }
                        else { //close
                            $element.find('.mp-level').removeClass('mp-level-open');
                            $element.parents('.mp-level').removeClass('mp-level-in-stack');
                        }
                    }
                });
            },
            scope: {
                'label': '@',
                'pagename': '@',
                'parentMenu': '@',
                'description': '@'
            },
            transclude: 'true'
        };
    }]).directive('menuHead', ['menuSvc', '$compile', function (menuSvc, $compile) {
        return {
            restrict: 'E',
            template: "<div id='mp-mainlevel'><ul><li><a class='icon icon-TabSearch'  ng-click='showSearchMenu()' tooltip-placement='right' tooltip='Search for menu properties'></a></li></ul></div>",
            replace: true,
            scope: {},
            controller: function ($scope) {
                $scope.showSearchMenu = function () {
                    menuSvc.setMenu('search');
                }
            },
            compile: function (tElemnt, tAttr, transclude) {
                var ul = tElemnt.find('ul');
                var elements = menuSvc.get();
                var compiledContents;
                angular.forEach(elements, function (value) {
                    var elm = angular.element('<li></li>');
                    elm.html('<a class="icon icon-' + value.icon + '" tooltip-placement="right" tooltip="' + value.label + '"></a>');
                    elm.on('click', function () {
                        menuSvc.setMenu(value.model);
                    });
                    ul.append(elm);
                });
                return  function () {
                }
            }
        }
    }]);