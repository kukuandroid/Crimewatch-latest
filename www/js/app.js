var app = angular.module('CrimeWatch', ['ionic', 'ngCordova', 'ionic.ion.headerShrink', 'ionic-modal-select', 'angular-datepicker', 'leaflet-directive', 'firebase']);

//reference to the Firebase
try {
    var ref = new Firebase("https://crimewatch-1334.firebaseio.com/");
    console.log("Firebase Connected..");

} catch (err) {
    console.log(err);
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
        .state('matchingResult', {
        url: "/matchingResult",
        controller: 'matchingController',
        templateUrl: 'templates/match_result.html'
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
app.controller("SnapCrimeCtrl", function($ionicHistory,$scope, $cordovaCamera,$cordovaGeolocation, $interval,$ionicLoading,$timeout,$firebaseArray,$state,imageService,ImageUploadFactory,EnrollService) {
  $scope.undo = function(){
        $ionicHistory.goBack();
    }

    //    var syncArray = $firebaseArray(ref.child("criminals"));

    var latitudeTest=  "";
    var longitudeTest ="";    
    $ionicLoading.show({
        noBackdrop: true,
        duration: 30000,
        templateUrl:"templates/loading.html"
    });

    $timeout(function () {
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
                latitudeTest = $scope.latitude;
                longitudeTest = $scope.longitude;
            },
                     function error(err) {
                $scope.errors = err;
            }
                    );
        }, 30000);

        if($scope.latitude != null && $scope.longitude !=null){
            $ionicLoading.hide();
        }

    }, 2000);

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
        //should be put in a factory
        $cordovaCamera.getPicture(options).then(function(imageData) {
            //$scope.imgURI bind to response from cloudinary
            // $scope.imgURI = "data:image/jpeg;base64," + imageData;
            var img =  "data:image/jpeg;base64," + imageData;
            //push the image to the Cloudinary Database, to be referenced with Firebase
            var responseURL = ImageUploadFactory.uploadImage(img);
            //continue the chain of promise
            responseURL.then(function(data){
                //use this binding to be push in database
                $scope.imgURI = data.secure_url;
                //enroll the image and subjectID taken to the Kairos API
                EnrollService.getService(data.secure_url,$scope.fullname).success(function(dataService){
                    console.log(dataService);
                    console.log("HTTP request success...");
                })
            });
        }, function(err) {
            // An error occured. Show a message to the user
        });
    }
    //disable submit to DB ( tipu users)
    //$scope.submitToDB = function(img,fullname,location,cases){
    $scope.submitToDB = function(img,fullname,location,cases){
        var ref = new Firebase("https://crimewatch-1334.firebaseio.com");
        crimeRef = ref.child("criminals");
        //url will be replaced with secure_url
        crimeRef.push({
            fullname:fullname,
            location : location,
            case : cases,
            url : img,
            latitude:  latitudeTest ,
            longitude:  longitudeTest,
        });
        $state.go('main');
    }

});



app.controller("CriminalListCtrl", function($state, $scope,$ionicHistory, $firebaseObject, $ionicActionSheet, $timeout,$ionicLoading,dataService,$cordovaCamera,imageService, $firebaseArray,ImageUploadFactory,RecogService) {

    //----cleannnnnnnnn----
    var ref = new Firebase("https://crimewatch-1334.firebaseio.com");
    $scope.images =[];
    var syncArrayImages = $firebaseArray(ref.child("images"));
    var syncArrayResults = $firebaseArray(ref.child("results"));

    $scope.show = function(lat,long,image,fullname) {

        //LocArray.push(val1,val2);
        // Show the action sheet
        var hideSheet = $ionicActionSheet.show({
            buttons: [{
                text: '<i class="icon dark ion-location"></i>  View Location '
            }, {
                text: '<i class="icon dark ion-person-stalker"></i> View Profile'
            },{
                text: '<i class="icon dark ion-camera"></i> Match Criminal '
            }],
            titleText: 'Choose your action',
            cancelText: 'Cancel',
            cancel: function() {
                // add cancel code..
            },
            buttonClicked: function(index, val) {
                // 0 : view location
                // 1 : view profile
                // 2 : view matching result

                switch (index) {
                    case 0:
                        //Handle  location Button
                        console.log("lat:"+lat+"long:"+long);
                        dataService.addData(lat,long);
                        $state.go('profileLocation');

                        return true;
                    case 1:
                        //Handle profile Button
                        return true;
                    case 2:
                        //Handle matching Button
                        //setting for camera   
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
                        //open camera
                        $cordovaCamera.getPicture(options).then(function(imageData) {

                            var imgURI = "data:image/jpeg;base64," + imageData;
                            var responseURL = ImageUploadFactory.uploadImage(imgURI);
                            //continue the chain of promise
                            responseURL.then(function(data){
                                //use this binding to be push in database
                                var picFromCloud = data.secure_url;
                                $ionicLoading.show({
                                    noBackdrop: true,
                                    duration: 30000,
                                    templateUrl:"templates/loading.html"
                                });
                                $timeout(function () {
                                    console.log(picFromCloud);
                                    RecogService.getService(picFromCloud).success(function(dataService){
                                        angular.forEach(dataService, function(items){
                                            angular.forEach(items, function(item){
                                                //sangkut, xleh sync sebab tagname : item.transaction.subject undefined
                                                console.log(item.transaction.status);                    console.log(item.transaction.subject);

                                                syncArrayResults.$add({result: item.transaction.status,tagname : item.transaction.subject,percentage:item.transaction.confidence}).then(function() {
                                                });
                                            });
                                        });
                                        $ionicLoading.hide();
                                    });
                                }, 2000);
                                //syncArrayImages will execute first
                                //syncArrayImages : for the next page, display side by side
                                syncArrayImages.$add({image: picFromCloud,criminalName : fullname}).then(function() {               
                                    console.log("Image has been uploaded");
                                });
                            });
                            //                            syncArrayImages.$add({image: picFromCloud,criminalName : fullname}).then(function() {               
                            //                                console.log("Image has been uploaded");
                            //                            });

                        }, function(err) {
                            console.log(err);
                        });
                        //put state here
                        imageService.addImage(image);
                        $state.go('matchingResult');
                };

            }
        });

        // For example's sake, hide the sheet after two seconds
        $timeout(function() {
            hideSheet();
        }, 3000);

    };
    $scope.criminals = [];
    var crimeRef = ref.child("criminals");
    $ionicLoading.show({
        noBackdrop: true,
        duration: 30000,
        templateUrl:"templates/loading.html"
    });
    $timeout(function () {
        crimeRef.on("value", function(snapshot) {
            console.log(snapshot.val());
            //    $scope.criminals.push(snapshot.val());
            $scope.criminals = $firebaseObject(crimeRef);

            syncObject = $firebaseObject(crimeRef);
            console.log("syncObject:" + syncObject);
            $ionicLoading.hide();
            //mapDatabaseService.addData(syncObject);
        }, function(errorObject) {
            console.log("The read failed: " + errorObject.code);
        });

        //        $ionicLoading.hide();

    }, 2000);

  $scope.undo = function(){
        $ionicHistory.goBack();
    }


});


app.controller('MapCtrl', function($ionicHistory,$scope, $state, $cordovaGeolocation,$window,$timeout,$ionicLoading ) {


  $scope.undo = function(){
        $ionicHistory.goBack();
    }

    var latitudeList = new Array();
    var longitudeList = new Array();
    var picList = new Array();

    var ref = new Firebase("https://crimewatch-1334.firebaseio.com");
    $ionicLoading.show({
        noBackdrop: true,
        duration: 30000,
        templateUrl:"templates/loading.html"
    });
    $timeout(function () {

        $ionicLoading.hide();   
    }, 2000);
    if (latitudeList.length == 0) {
        ref.child('criminals').on("value", function(snapshot) {
            var test = snapshot.val();
            for (var property in test) {
                if (test.hasOwnProperty(property)) {
                    //console.log(test[property].fullname);
                    latitudeList.push(test[property].latitude);
                    longitudeList.push(test[property].longitude);
                    picList.push(test[property].url);
                }
            }
            googleMapInitializer(latitudeList, longitudeList,picList);
        });
    }

    function googleMapInitializer (latitudeList, longitudeList,picList) {
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
                    locationObject.url = picList[i];
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
                //icon initialization
                var icon = new Array();  
                for (i = 0; i < locations.length; i++) {

                    icon[i] = {
                        url: locations[i].url, // url
                        scaledSize: new google.maps.Size(50, 50), // scaled size
                        origin: new google.maps.Point(0,0), // origin
                        anchor: new google.maps.Point(0, 0), // anchor
                        shape:{coords:[17,17,18],type:'circle'},
                    };
                }
                var marker, i;

                console.log(icon);
                //marker initialization
                for (i = 0; i < locations.length; i++) {  
                    marker = new google.maps.Marker({
                        //latitude longitude position
                        position: new google.maps.LatLng(locations[i].latitude, locations[i].longitude),
                        animation: google.maps.Animation.DROP,
                        map: map,
                        icon:icon[i]
                    });
                }

            })
        })
    }

});

app.controller('MapProfileCtrl', function($ionicHistory,$scope, $state,$window,$cordovaGeolocation,dataService) {
  $scope.undo = function(){
        $ionicHistory.goBack();
    }

    var latitudeList = new Array();
    var longitudeList = new Array();
    var picList = new Array();

    var ref = new Firebase("https://crimewatch-1334.firebaseio.com");

    if (latitudeList.length == 0) {
        ref.child('criminals').on("value", function(snapshot) {
            var test = snapshot.val();
            for (var property in test) {
                if (test.hasOwnProperty(property)) {
                    //console.log(test[property].fullname);
                    latitudeList.push(test[property].latitude);
                    longitudeList.push(test[property].longitude);
                    picList.push(test[property].url);

                }
            }
            googleMapInitializer(latitudeList, longitudeList,picList);
        });
    }


    function googleMapInitializer (latitudeList, longitudeList,picList) {
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
                    locationObject.url = picList[i];
                    locations.push(locationObject);
                }
                //conditional statement
                var address =dataService.getData();
                //set user's location
                var map = new google.maps.Map(document.getElementById('map'), {
                    zoom: 10,
                    center: new google.maps.LatLng(address[0].latitude,address[0].longitude),
                    mapTypeId: google.maps.MapTypeId.ROADMAP
                });
                var infowindow = new google.maps.InfoWindow();
                //icon initialization
                var icon = new Array();  
                for (i = 0; i < locations.length; i++) {

                    icon[i] = {
                        url: locations[i].url, // url
                        scaledSize: new google.maps.Size(50, 50), // scaled size
                        origin: new google.maps.Point(0,0), // origin
                        anchor: new google.maps.Point(0, 0), // anchor
                        shape:{coords:[17,17,18],type:'circle'},
                    };
                }
                var marker, i;

                console.log(icon);
                //marker initialization
                for (i = 0; i < locations.length; i++) {  
                    marker = new google.maps.Marker({
                        //latitude longitude position
                        position: new google.maps.LatLng(locations[i].latitude, locations[i].longitude),
                        animation: google.maps.Animation.DROP,
                        map: map,
                        icon:icon[i]
                    });
                }

            })
        })
    }



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

//read the first value, return null at first, second will be okay
app.service('imageService', function() {
    var img = "";
    var secureURL="";

    var addImage = function(image) {
        img =image;
    };
    var addImageURL = function(url) {
        secureURL =url;
    };
    var getImage = function(){
        return img; 
    };
    var getImageURL = function(){
        return secureURL; 
    };
    return {
        addImage: addImage,
        addImageURL: addImageURL,
        getImage: getImage,
        getImageURL: getImageURL
    };
});

app.service('CameraPic', function () {
    return {};
})

app.controller('matchingController', function($scope,imageService,$state) {
    //put logger here
    var ref = new Firebase("https://crimewatch-1334.firebaseio.com/");
    var crimeRef = ref.child("images");
    var resultRef = ref.child("results");
    crimeRef.on("value", function(snapshot) {
        var pic = snapshot.val();
        for (var property in pic) {
            if (pic.hasOwnProperty(property)) {
                $scope.criminalPic = pic[property].image;
                var crimName = pic[property].criminalName;
                resultRef.on("value", function(snapshot) {
                    //read the latest result
                    var status = snapshot.val();
                    for (var property in status) {
                        if (status.hasOwnProperty(property)) {
                            //                $scope.resultss = status[property].result;
                            if(status[property].result == "success"){
                                //equal to fullname, fullname is subjectID
                                if(status[property].tagname == crimName){
                                    console.log("match");
                                    var percent=  status[property].percentage;
                                    $scope.percentage = ((percent /1)*100).toFixed(2);
                                    $scope.resultss = "match (Success)";
                                } 
                                else{
                                    $scope.resultss = "Not Match (Failure)";
                                    $scope.percentage = "No Percentage";

                                }
                            }
                        }}}); 
            }
        }}); 
    //    resultRef.on("value", function(snapshot) {
    //        var status = snapshot.val();
    //        for (var property in status) {
    //            if (status.hasOwnProperty(property)) {
    //                //                $scope.resultss = status[property].result;
    //                if(status[property].result == "success"){
    //                    //equal to fullname, fullname is subjectID
    //                    if(status[property].subjectID == $scope.nama){
    //                        console.log("match");
    //                        $scope.resultss = "match (Success)";
    //                    } 
    //                    else{
    //                        $scope.resultss = "Not Match (Failure)";
    //                    }
    //                }
    //            }}}); 

    $scope.image = imageService.getImage();
    $scope.finish = function(){
        $state.go("main");
    }
})

//Recognition, Takes an image and tries to match it against the already enrolled images in a gallery you define
app.service('RecogService', function ($http){
    this.getService = function(recogImage){
        return $http({
            method: 'POST', 
            url: 'https://kairos-face-recognition.p.mashape.com/recognize', 
            headers: {'X-Mashape-Key': 'ZDitltitaCmsh13IbFlOrfxcUXDup1234YujsnOSOarPl4bV0k',
                      'Content-Type': 'application/json',
                      'app_id': '206b5d1a',
                      'app_key': '35e423347de87f9b9acee1028dd1ede3',

                      'Accept': 'application/json' },
            data: { 'url': recogImage,'gallery_name':'Criminals','threshold':'.7','max_num_results':'3' }
        })
            .success(function(response) {
            console.log(response);

        });

    } 
});

//Enroll, Takes an image and stores it as a face template into a gallery you define
app.service('EnrollService', function ($http){
    this.getService = function(picurl,subjectID){
        return $http({
            method: 'POST', 
            url: 'https://kairos-face-recognition.p.mashape.com/enroll', 
            headers: {'X-Mashape-Key': 'ZDitltitaCmsh13IbFlOrfxcUXDup1234YujsnOSOarPl4bV0k',
                      'Content-Type': 'application/json',
                      'app_id': '206b5d1a',
                      'app_key': '35e423347de87f9b9acee1028dd1ede3',
                      'Accept': 'application/json' },
            data: { 'url': picurl,'gallery_name':'Criminals','subject_id':subjectID }
        })
            .success(function(response) {
        });

    } 
});

app.factory('ImageUploadFactory', function ($q, $ionicLoading, $cordovaFileTransfer) {
    return {          
        uploadImage: function (imageURI) {
            console.log('start upload image.');
            var deferred = $q.defer();

            uploadFile();

            function uploadFile() {
                $ionicLoading.show({template : 'Uploading image...'});
                // Add the Cloudinary "upload preset" name to the headers
                var uploadOptions = {
                    params : { 'upload_preset': "testing"}
                };
                $cordovaFileTransfer
                // Your Cloudinary URL will go here
                    .upload("https://api.cloudinary.com/v1_1/crimewatch/image/upload", imageURI, uploadOptions)

                    .then(function(result) {
                    // Let the user know the upload is completed
                    $ionicLoading.show({template : 'Done.', duration: 1000});
                    var response = JSON.parse(decodeURIComponent(result.response));
                    console.log(response);
                    console.log(response.secure_url);
                    deferred.resolve(response);
                }, function(err) {
                    // Uh oh!
                    $ionicLoading.show({template : 'Failed.', duration: 3000});
                    deferred.reject(err);
                }, function (progress) {

                });
            }
            return deferred.promise;
        },
    }
});


