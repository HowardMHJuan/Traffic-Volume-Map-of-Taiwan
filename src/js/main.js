var Papa = require('papaparse');
var Proj4 = require('proj4');
var map;

function addWeatherStation() {
  Papa.parse(`./src/data/weather_station.csv`, {
    download: true,
    complete: function(results) {
      console.log("Parsing complete:", results);
      var data = results.data;
      for (var i = 0; i < data.length; i++) {
        if (data[i].length <= 3 || data[i][3].trim().length == 0) break;
        var latLng = new google.maps.LatLng(data[i][4], data[i][3]);
        var marker = new google.maps.Marker({
          position: latLng,
          map: map,
          icon: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/1/11/BlackDot.svg',
            scaledSize: {
              height: 10, 
              width: 10
            }
          }
        });
      }
    }
  });
}

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 8,
    center: new google.maps.LatLng(23.6,121),
    mapTypeId: 'terrain'
  });
  var iconUrlPrefix = 'https://maps.google.com/mapfiles/ms/micons/';
  var iconUrlSuffix = '.png';
  var iconColors = ['lightblue', 'green', 'yellow', 'orange', 'red', 'purple'];
  var iconGrade = [1000, 5000, 10000, 15000, 20000];
  var icons = [];
  iconColors.forEach(function(color) {
    icons.push(`${iconUrlPrefix}${color}${iconUrlSuffix}`);
  });
  for (var i = 0; i <= 6; i++) {
    Papa.parse(`./src/data/csv/${i}.csv`, {
      download: true,
      complete: function(results, file) {
        console.log("Parsing complete:", results, file);
        var fileId = file[15];
        var data = results.data;
        var heatmapData = [];
        for (var j = 7; j + 1 < data.length; j += 2) {
          if (data[j].length <= 4 || data[j + 1].length <= 4) continue;
          var lat = data[j + 1][4], lng = data[j][4];
          if (lat.trim().length === 0 || lng.trim().length === 0) continue;
          // Fuck government. They use different formats and coord systems among data.
          switch (fileId) {
            case '0':
            case '1':
            case '2':
            case '3':
              lat = lat.slice(1, -1).split('\'');
              lng = lng.slice(1, -1).split('\'');
              lat = Number(lat[0]) + (Number(lat[1]) + Number(lat[2]) / 60) / 60;
              lng = Number(lng[0]) + (Number(lng[1]) + Number(lng[2]) / 60) / 60;
              // console.log(lat, lng);              
              break;
            case '4':
            case '6':
              lat = lat.slice(1);
              lng = lng.slice(1);
              break;
            case '5':
              // console.log(lat, lng);
              if (Number(lat) < 1000000) { // err handling
                var temp = lat;
                lat = lng;
                lng = temp;
                break;
              }
              Proj4.defs('EPSG:3826', '+title=TWD97 +proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +no_defs');
              var lngLat = Proj4('EPSG:3826', 'EPSG:4326', [Number(lng), Number(lat)]);
              lat = lngLat[1];
              lng = lngLat[0];
              if (lng > 140) lng -= 20; // err handling
              break;
            default:
          }
          var latLng = new google.maps.LatLng(lat, lng);
          var trafficVol =  Number(data[j][18].trim().split(',').join(''));
          var weightedLocation = {
            location: latLng,
            weight: trafficVol
          };
          heatmapData.push(weightedLocation);
          // console.log([latLng.lat(), latLng.lng()], trafficVol);
          var iconIdx;
          if      (trafficVol < iconGrade[0]) iconIdx = 0;
          else if (trafficVol < iconGrade[1]) iconIdx = 1;
          else if (trafficVol < iconGrade[2]) iconIdx = 2;
          else if (trafficVol < iconGrade[3]) iconIdx = 3;
          else if (trafficVol < iconGrade[4]) iconIdx = 4;
          else                                iconIdx = 5;
          var marker = new google.maps.Marker({
            position: latLng,
            map: map,
            icon: {
              url: icons[iconIdx],
              scaledSize: {
                height: 20, 
                width: 15
              }
            }
          });
        }
        var heatmap = new google.maps.visualization.HeatmapLayer({
          data: heatmapData,
          // radius: 20,
          map: map
        });
      }
    });
  }
  var legend = document.getElementById('legend');
  icons.forEach(function(icon, idx) {
    var div = document.createElement('div');
    if (idx == 0) {
      div.innerHTML = `<img src="${icon}"> ${iconGrade[idx]} 以下`;
    } else if (idx == 5) {
      div.innerHTML = `<img src="${icon}"> ${iconGrade[idx - 1]} 以上`;
    } else {
      div.innerHTML = `<img src="${icon}"> ${iconGrade[idx - 1]}～${iconGrade[idx]}`;
    }
    legend.appendChild(div);
  });
  var div = document.createElement('div');
  div.setAttribute('id', 'dot');
  div.innerHTML = `<img src="https://upload.wikimedia.org/wikipedia/commons/1/11/BlackDot.svg">氣象測站`;
  legend.appendChild(div);
  map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(legend);
  // addWeatherStation();
}

initMap();
