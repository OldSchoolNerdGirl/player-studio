'use strict';
var DirectivesModule = angular.module('KMC.directives');
DirectivesModule.directive('modelColor', [function() {
    return {
        restrict: 'EA',
        priority: 10,
        require: '?playerRefresh',
        replace: true,
        controller: ['$scope', '$element', '$attrs', function($scope, $element, $attrs) {
            if (typeof $scope.model == 'undefined') {
                if ($attrs.initvalue)
                    $scope.model = $attrs.initvalue;
                else
                    $scope.model = '#ffffff';
            }
            $scope.initValue = $scope.model.toString();
        }],
        link: function($scope, $elemennt, $attrs, prController) {
            if (prController) {
                prController.setValueBased();
            }
        },
        scope: {
            'label': '@',
            'strModel': '@model',
            'helpnote': '@',
            'model': '='
        },
        templateUrl: 'template/formcontrols/modelColor.html'
    };
}]);