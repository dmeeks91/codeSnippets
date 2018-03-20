(function () {

    'use strict';
    MyApp.angular.controller('RatingPageController',
             ['$scope', '$http', '$timeout', 'Offline', 'InitService', 'DataService', 'localDBStrategy', 'dbFunctions',
    function ($scope, $http, $timeout, Offline, InitService, DataService, localDBStrategy, dbFunctions) {

        var ratingScoreObject = [];
        var attrObject = [];

        var onRatingScoreObject = function (data)
        {
            if (Offline.state === 'up')
            {
                ratingScoreObject = JSON.parse(data.data.substring(data.data.indexOf("["), data.data.lastIndexOf("]") + 1));
                //upload userDetails to indexedDB so that accessible while offline
                dbFunctions.updateDBStore({ data: { obj: ratingScoreObject, NAME: 'rateObject' }, store: 'serverObjects' });
                $scope.ratingIndex = ratingScoreObject;
            }
            else
            {
                dbFunctions.getDBObject('serverObjects', 'rateObject').then(
                    function (result)
                    {
                        if (result.length != 0)
                        {
                            ratingScoreObject = result.obj;
                            $scope.ratingIndex = ratingScoreObject;
                        }
                    });
            }
            
        }

        function commentRequired (needComment)
        {
            var hideShow = (needComment) ? 'show' : 'hide';
            var addRemove = (needComment) ? 'addClass' : 'removeClass';
            $('#needComment')[hideShow]();
            $('#backFromRate')[addRemove]('disabled');
            $('#commentsBlock')[addRemove]('invalidObj');
            $('#commentsImage')[addRemove]('invalidText');
        }

        var onError = function (data)
        {
            console.log('error...');
            console.log(data);
        }
        
        DataService.getRatingScoreObject().then(onRatingScoreObject, onError);
    
        //pass variable through event listener
        $scope.onRateAttr = function (rate)
        {
            DataService.dispatchEvent('attributeRated', rate);
            $scope.thisRate = rate;
            switch(rate.ScoreValue)
            {
                case '0':
                case '2':
                    commentRequired(false);
                    MyApp.fw7.views[0].router.back();
                    break;
                default:
                    if (attrObject.Comment.length == 0) commentRequired(true);
            }
        }

        $$('.rateAttr').on('touchstart', function (e)
        {
            console.log('Rate Attribute');
            console.log(e);            
        })

        $scope.onAddComment = function (comment)
        {
            commentRequired(false);
            attrObject.Comment = comment;
            DataService.dispatchEvent('commentAdded', comment);
        }

        //consume passed variable passed by service
        DataService.addEventListener('attributeSelected', function (attribute) {
            attrObject = attribute
            $scope.attribute = attrObject;
        })

    }]);
}());