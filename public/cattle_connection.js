// Cattle vars
var $cattle_name = $("#name-box");
var $cattle_id = $("#id-box");
var $cattle_breed = $("#breed-box");
var $cattle_age = $("#age-box");
var $cattle_vaccines = $("#vaccines-box");
var $cattle_comments = $("#comments-box");

// Device info
var $battery_level = $("#battery-box");

// Ubidots vars
var user_token = "yourTokenHere";

// Storage variables
var cows = [];
var cows_locations = [];
var cows_battery = [];
var cows_temperature = [];
var cows_temperature_time = [];

// Map functions
var map;

function initMarkers(vectorLayer, initialPosition) {
    var feature;
    var i = 0;

    cows.forEach(function(cow) {
        feature = new OpenLayers.Feature.Vector(
            new OpenLayers.Geometry.Point(cows_locations[i].lng, cows_locations[i].lat).transform('EPSG:4326', 'EPSG:3857'),
            { name: cow.name, id: cow.id, breed: cow.breed, age: cow.age, vaccines: cow.vaccines, comments: cow.comments, number: i++ },
            { externalGraphic: 'cow.png', graphicHeight: 25, graphicWidth: 21, graphicXOffset: -12, graphicYOffset: -25 }
        );

        vectorLayer.addFeatures(feature);
    });
}

function initMap(initialPosition) {
    var vectorLayer = new OpenLayers.Layer.Vector("overlay");
    initMarkers(vectorLayer, initialPosition);

    var controls = {
        selector: new OpenLayers.Control.SelectFeature(vectorLayer, {
            onSelect: function (feature) {
                populateInformationSidebar(feature.attributes, feature.attributes.number);
            }
        })
    };

    map = new OpenLayers.Map('map', {
        projection: 'EPSG:3857',
        layers: [ new OpenLayers.Layer.Google("Google Streets", { numZoomLevels: 20 }), vectorLayer ],
        center: new OpenLayers.LonLat(initialPosition.lng, initialPosition.lat).transform('EPSG:4326', 'EPSG:3857'),
        zoom: 15,
    });

    map.addControl(controls.selector);
    controls.selector.activate();
}

function populateDatasourcesSidebar() {
    var $cow_datasources = $("#cow_datasources");
    var i = 0;
    cows.forEach(function (cow) {
        $cow_datasources.append("<tr><td><a href='#' class='cow_information' data-id='" + i++ + "''>" + cow.name + "</a></td></tr>");
    });
}

function populateInformationSidebar(cow_info, number) {
    $cattle_name.text(cow_info.name);
    $cattle_id.text(cow_info.id);
    $cattle_breed.text(cow_info.breed);
    $cattle_age.text(cow_info.age);
    $cattle_vaccines.text(cow_info.vaccines);
    $cattle_comments.text(cow_info.comments);
    $battery_level.text(cows_battery[number] + "%");

    showTemperature(number);
}

$(document).on("click", ".cow_information", function(event) {
    var cow_id = $(this).data("id");
    var cow_info = cows[cow_id];
    var cow_location = cows_locations[cow_id];

    map.setCenter(new OpenLayers.LonLat(cow_location.lng, cow_location.lat).transform('EPSG:4326', 'EPSG:3857'), 15);
    populateInformationSidebar(cow_info, cow_id);
});

// Ubidots functions
function getDataSources() {
    $.ajax({
        url: "http://things.ubidots.com/api/v1.6/datasources",
        data: { "token": user_token }
    }).done(function (data) {
        var datasources = data.results;
        datasources.forEach(function (datasource) {
            if (datasource.tags.indexOf("cattle") != -1) {
                cows.push(prepareDatasource(datasource));
                getVariables(datasource.variables_url);
            }
        });
        populateDatasourcesSidebar();
    });
}

function getVariables(url) {
    $.ajax({
        url: url,
        data: { "token": user_token }
    }).done(function (data) {
        var variables = data.results;
        variables.forEach(function (variable) {
            if (variable.name.indexOf("location") != -1) getLocationDetails(variable.values_url);
            if (variable.name.indexOf("battery") != -1) getBatteryDetails(variable.values_url);
            if (variable.name.indexOf("temperature") != -1) getTemperatureDetails(variable.values_url);
        });
    });
}

function getLocationDetails(url) {
    $.ajax({
        url: url,
        data: { "token": user_token }
    }).done(function (data) {
        var location = data.results[0].context;
        cows_locations.push(location);
    }).done(function () {
        initMap(cows_locations[0]);
    });
}

function getBatteryDetails(url) {
    $.ajax({
        url: url,
        data: { "token": user_token }
    }).done(function (data) {
        var battery = data.results[0].value;
        cows_battery.push(battery);
    });
}

function getTemperatureDetails(url) {
    $.ajax({
        url: url,
        data: {
            "page_size": 100,
            "token": user_token
        },
    }).done(function(data) {
        var raw_temperature = [];
        var raw_time = [];

        data.results.forEach(function (data) {
            raw_temperature.push(data.value);
            raw_time.push(data.created_at);
        });

        cows_temperature.push(raw_temperature);
        cows_temperature_time.push(raw_time);
    });

}

// Common stuff
function prepareDatasource(datasource) {
    cow = {};
    cow.name = datasource.name;
    cow.id = datasource.id;
    cow.breed = datasource.context.breed;
    cow.age = datasource.context.age;
    cow.vaccines = datasource.context.vaccines;
    cow.comments = datasource.context.comments;

    return cow;
}

// Highcharts
function showTemperature(number) {
    var cow_temperature = cows_temperature[number];
    var cow_temperature_time = cows_temperature_time[number];

    $("#chart").highcharts({
        title: { text: "Temperature" },
        yAxis: { title: { text: "Temperature (Cº)" } },
        xAxis: { categories: cow_temperature_time, labels: { enabled: false } },
        tooltip: { valueSuffix: "ºC" },
        series: [{ name: "Temperature", data: cow_temperature }]
    });
}

$(document).on("ready", function () {
    getDataSources();
});
