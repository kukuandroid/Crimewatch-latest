var app = angular.module('CrimeWatch', ['ionic', 'ngCordova', 'ionic.ion.headerShrink', 'ionic-modal-select', 'angular-datepicker', 'leaflet-directive', 'firebase']);

//reference to the Firebase
try {
    var ref = new Firebase("https://crimewatch-1334.firebaseio.com/");
    console.log("Firebase Connected..");
} catch (err) {
    console.log(ex);
}
app.run(function($ionicPlatform) {
    $ionicPlatform.ready(function() {
        if (window.cordova && window.cordova.plugins.Keyboard) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
            cordova.plugins.Keyboard.disableScroll(true);
        }
        if (window.StatusBar) {
            StatusBar.styleDefault();
        }


    });
})

app.config(function($stateProvider, $urlRouterProvider) {

    $stateProvider
        .state('intro', {
        url: "/intro",
        templateUrl: 'templates/intro.html'
    })
        .state('main', {
        url: "/main",
        templateUrl: 'templates/main.html'
    })
        .state('criminalList', {
        url: "/criminalList",
        controller: 'CriminalListCtrl',
        templateUrl: 'templates/criminal_list.html'
    })
        .state('snapCriminal', {
        url: "/snapCriminal",
        templateUrl: 'templates/snap_criminal.html'
    })
        .state('addCriminal', {
        url: "/addCriminal",
        templateUrl: 'templates/add_criminal.html'
    })
        .state('criminalLocation', {
        url: "/criminalLocation",
        controller: 'MapCtrl',
        templateUrl: 'templates/criminal_location.html'
    })
        .state('profileLocation', {
        url: "/profileLocation",
        controller: 'MapProfileCtrl',
        templateUrl: 'templates/profile_location.html'
    })
        .state('snapOption', {
        url: "/snapOption",
        templateUrl: 'templates/snap_option.html'
    })


    //default URL
    $urlRouterProvider.otherwise('/intro');
})

//Camera Controller
app.controller("SnapCrimeCtrl", function($scope, $cordovaCamera) {

    $scope.takePicture = function() {
        var options = {
            quality: 75,
            destinationType: Camera.DestinationType.DATA_URL,
            sourceType: Camera.PictureSourceType.CAMERA,
            allowEdit: true,
            encodingType: Camera.EncodingType.JPEG,
            targetWidth: 300,
            targetHeight: 300,
            popoverOptions: CameraPopoverOptions,
            saveToPhotoAlbum: false
        };

        $cordovaCamera.getPicture(options).then(function(imageData) {
            $scope.imgURI = "data:image/jpeg;base64," + imageData;
            console.log("imgURI : " + imgURI);
        }, function(err) {
            // An error occured. Show a message to the user
        });
    }

});

app.controller("formCtrl", function($scope, $cordovaGeolocation, $interval) {
    $scope.options = {
        format: 'yyyy-mm-dd', // ISO formatted date
        onClose: function(e) {}
    }
    $interval(function() {

        var geoSettings = {
            frequency: 30000,
            timeout: 100000,
            enableHighAccuracy: false
        };

        var geo = $cordovaGeolocation.getCurrentPosition(geoSettings);

        geo.then(function(position) {

            $scope.latitude = position.coords.latitude;
            $scope.longitude = position.coords.longitude;
        },
                 function error(err) {
            $scope.errors = err;
        }
                );
    }, 30000);
});


app.controller("CriminalListCtrl", function($state, $scope, $firebaseObject, $ionicActionSheet, $timeout,dataService) {
    //var LocArray= new Array();
    //var LocObj= new Object();


    $scope.show = function(val1,val2) {

        //LocArray.push(val1,val2);
        // Show the action sheet
        var hideSheet = $ionicActionSheet.show({
            buttons: [{
                text: '<i class="icon dark ion-location"></i>  View Location '
            }, {
                text: '<i class="icon dark ion-person-stalker"></i> View Profile'
            }],
            titleText: 'Choose your action',
            cancelText: 'Cancel',
            cancel: function() {
                // add cancel code..
            },
            buttonClicked: function(index, val) {
                // 0 : view location
                // 1 : view profile
                switch (index) {
                    case 0:
                        //Handle  location Button
                        console.log("lat:"+val1+"long:"+val2);
                        dataService.addData(val1,val2);
                        $state.go('profileLocation');

                        return true;
                    case 1:
                        //Handle profile Button
                        return true;
                }
                return true;
            }
        });

        // For example's sake, hide the sheet after two seconds
        $timeout(function() {
            hideSheet();
        }, 3000);

    };

    //control data from firebase
    $scope.criminals = [];
    var crimeRef = ref.child("criminals");
    crimeRef.on("value", function(snapshot) {
        console.log(snapshot.val());
        //    $scope.criminals.push(snapshot.val());
        $scope.criminals = $firebaseObject(crimeRef);
        syncObject = $firebaseObject(crimeRef);
        console.log("syncObject:" + syncObject);
        //mapDatabaseService.addData(syncObject);
    }, function(errorObject) {
        console.log("The read failed: " + errorObject.code);
    });



});


app.controller('MapCtrl', function($scope, $state, $cordovaGeolocation,$window ) {

    var latitudeList = new Array();
    var longitudeList = new Array();
    //    $scope.latitudeList = new Array();
    //    $scope.longitudeList = new Array();

    var ref = new Firebase("https://crimewatch-1334.firebaseio.com");

    if (latitudeList.length == 0) {
        ref.child('criminals').on("value", function(snapshot) {
            var test = snapshot.val();
            for (var property in test) {
                if (test.hasOwnProperty(property)) {
                    //console.log(test[property].fullname);
                    latitudeList.push(test[property].latitude);
                    longitudeList.push(test[property].longitude);
                }
            }
            googleMapInitializer(latitudeList, longitudeList);
        });
    }


    function googleMapInitializer (latitudeList, longitudeList) {

        $window.navigator.geolocation.getCurrentPosition(function(position) {

            $scope.$apply(function() {

                //user for setting user locations
                $scope.lat = position.coords.latitude;
                $scope.lng = position.coords.longitude;
                //put google Map APIs here
                //var locations = [[latitudeList, longitudeList]];

                var locations = new Array();

                for (var i=0;i<latitudeList.length;i++){

                    var locationObject = new Object();
                    locationObject.latitude = latitudeList[i];
                    locationObject.longitude = longitudeList[i];
                    locations.push(locationObject);

                }
                //conditional statement

                //set user's location
                var map = new google.maps.Map(document.getElementById('map'), {
                    zoom: 10,
                    center: new google.maps.LatLng($scope.lat,$scope.lng),
                    mapTypeId: google.maps.MapTypeId.ROADMAP
                });

                var infowindow = new google.maps.InfoWindow();
                //icon testing
                var icon = {
                    url: 'img/1.jpg', // url
                    scaledSize: new google.maps.Size(50, 50), // scaled size
                    origin: new google.maps.Point(0,0), // origin
                    anchor: new google.maps.Point(0, 0), // anchor
                    shape:{coords:[17,17,18],type:'circle'},
                };
                var marker, i;

                //marker initialization
                for (i = 0; i < locations.length; i++) {  
                    marker = new google.maps.Marker({
                        //latitude longitude position
                        position: new google.maps.LatLng(locations[i].latitude, locations[i].longitude),
                        map: map,
                        icon:icon
                    });
                }

            })
        })
    }

});

app.controller('MapProfileCtrl', function($scope, $state,$window,$cordovaGeolocation,dataService) {

    var latitudeList = new Array();
    var longitudeList = new Array();
    //    $scope.latitudeList = new Array();
    //    $scope.longitudeList = new Array();

    var ref = new Firebase("https://crimewatch-1334.firebaseio.com");

    if (latitudeList.length == 0) {
        ref.child('criminals').on("value", function(snapshot) {
            var test = snapshot.val();
            for (var property in test) {
                if (test.hasOwnProperty(property)) {
                    //console.log(test[property].fullname);
                    latitudeList.push(test[property].latitude);
                    longitudeList.push(test[property].longitude);
                }
            }
            googleMapInitializer(latitudeList, longitudeList);
        });
    }


    function googleMapInitializer (latitudeList, longitudeList) {

        $window.navigator.geolocation.getCurrentPosition(function(position) {

            $scope.$apply(function() {

                //user for setting user locations
                $scope.lat = position.coords.latitude;
                $scope.lng = position.coords.longitude;
                //put google Map APIs here
                //var locations = [[latitudeList, longitudeList]];

                var locations = new Array();

                for (var i=0;i<latitudeList.length;i++){

                    var locationObject = new Object();
                    locationObject.latitude = latitudeList[i];
                    locationObject.longitude = longitudeList[i];
                    locations.push(locationObject);

                }
                //conditional statement
                var address =dataService.getData();
                console.log(address);
                //set user's location
                var map = new google.maps.Map(document.getElementById('map'), {
                    zoom: 10,
                    center: new google.maps.LatLng(address[0].latitude,address[0].longitude),
                    mapTypeId: google.maps.MapTypeId.ROADMAP
                });

                var infowindow = new google.maps.InfoWindow();

                var marker, i;

                //marker initialization
                for (i = 0; i < locations.length; i++) {  
                    marker = new google.maps.Marker({
                        //latitude longitude position
                        position: new google.maps.LatLng(locations[i].latitude, locations[i].longitude),
                        map: map
                    });
                }

            })
        })
    }



    //    var map = new google.maps.Map(document.getElementById('map'), {
    //        zoom: 8,
    //        center: {lat: -34.397, lng: 150.644}
    //    });
    //    var geocoder = new google.maps.Geocoder();

    //    //change address to user value
    //    geocoder.geocode({'address': address}, function(results, status) {
    //        if (status === google.maps.GeocoderStatus.OK) {
    //            map.setCenter(results[0].geometry.location);
    //            var marker = new google.maps.Marker({
    //                map: map,
    //                position: results[0].geometry.location
    //            });
    //        } else {
    //            alert('Geocode was not successful for the following reason: ' + status);
    //        }
    //    });


});

app.service('dataService', function() {
    var obj = new Object();
    var list = new Array();


    var addData = function(lat,long) {
        obj.latitude = lat;
        obj.longitude = long;
        list.push(obj);  
    };

    var getData = function() {
        return list;
    };

    return {
        addData: addData,
        getData: getData
    };

});


//app.service("FirebaseService", function($firebaseObject,dataService) {
//    var latitudeList = new Array();
//    var longitudeList = new Array();
//
//    var ref = new Firebase("https://crimewatch-1334.firebaseio.com");
//    
//    if(latitudeList.length == 0){
//        ref.child('criminals').on("value", function(snapshot) {
//        var test = snapshot.val();
//        for (var property in test) {
//            if (test.hasOwnProperty(property)) {
//                //console.log(test[property].fullname);
//                latitudeList.push(test[property].latitude);
//                longitudeList.push(test[property].longitude);
//            }
//        }
//        // newFunction(latitudeList, longitudeList); 
//    });
//    }
//});
//
//function newFunction(latitudeList, longitudeList){
//    var array = [];
//    array.push(latitudeList,longitudeList);
//    //console.log(latitudeList);
//   // console.log(array);
//    return array;
//}