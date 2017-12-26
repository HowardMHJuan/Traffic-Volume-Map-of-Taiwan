var Papa = require('papaparse');
var Proj4 = require('proj4');
var map;
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 8,
    center: new google.maps.LatLng(23.6,121),
    mapTypeId: 'terrain'
  });
  for (var i = 0; i <= 5; i++) {
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
          var iconUrlPrefix = 'http://maps.google.com/mapfiles/ms/micons/';
          var iconUrlSuffix = '.png';
          var iconGrade = [1000, 5000, 10000, 15000, 20000];
          var iconColor;
          if      (trafficVol < iconGrade[0]) iconColor = 'lightblue';
          else if (trafficVol < iconGrade[1]) iconColor = 'green';
          else if (trafficVol < iconGrade[2]) iconColor = 'yellow';
          else if (trafficVol < iconGrade[3]) iconColor = 'orange';
          else if (trafficVol < iconGrade[4]) iconColor = 'red';
          else                                iconColor = 'purple';
          var marker = new google.maps.Marker({
            position: latLng,
            map: map,
            icon: `${iconUrlPrefix}${iconColor}${iconUrlSuffix}`
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

}
initMap();
