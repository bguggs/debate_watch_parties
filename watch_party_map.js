let map = null;
let places_service = null;
let markers = [];
let prevInfoWindow = false;


const candidate_data = {
    swalwell: {
        icon_url: "map-icon-orange.png",
        event_count: 0,
        display_name: "Swalwell",
        organization_ids: ["1116"]
    },
    gillibrand: {
        icon_url: "map-icon-green.png",
        event_count: 0,
        display_name: "Gillibrand",
        organization_ids: ["1263"]
    },
    harris: {
        icon_url: "map-icon-red.png",
        event_count: 0,
        display_name: "Harris",
        organization_ids: ["1264"]
    },
    buttigieg: {
        icon_url: "map-icon-yellow.png",
        event_count: 0,
        display_name: "Buttigieg",
        organization_ids: ["1297", "1477", "1478", "1479", "1480"]
    },
    warren: {
        icon_url: "map-icon-light-blue.png",
        event_count: 0,
        display_name: "Warren",
        organization_ids: ["1361", "1416", "1360", "1316", "1310"]
    },
    castro: {
        icon_url: "map-icon-magenta.png",
        event_count: 0,
        display_name: "Castro",
        organization_ids: ["1362"]
    },
    ryan: {
        icon_url: "map-icon-black.png",
        event_count: 0,
        display_name: "Ryan",
        organization_ids: ["1392"]
    },
    biden: {
        icon_url: "map-icon-purple.png",
        event_count: 0,
        display_name: "Biden",
        organization_ids: ["1393"]
    },
    yang: {
        icon_url: "map-icon-pink.png",
        event_count: 0,
        display_name: "Yang",
        organization_ids: ["1396"]
    },
    hickenlooper: {
        icon_url: "map-icon-teal.png",
        event_count: 0,
        display_name: "Hickenlooper",
        organization_ids: ["1415", "1295"]
    },
    booker: {
        icon_url: "map-icon-gray.png",
        event_count: 0,
        display_name: "Booker",
        organization_ids: ["1435", "1436", "1374", "1354", "1360", "1270"]
    },
};

const location_dict = {};

const organization_ids = ["1297", "1477", "1478", "1479", "1480"];

var factory = function(){
    var time = 0, count = 0, difference = 0, queue = [];
    return function limit(func){
        if(func) queue.push(func);
        difference = 1000 - (window.performance.now() - time);
        if(difference <= 0) {
            time = window.performance.now();
            count = 0;
        }
        if(++count <= 10) (queue.shift())();
        else setTimeout(limit, difference);
    };
};

var limited = factory();


class Event {
    constructor(title, timestamp, desc, candidate, image_url, external_url) {
        this.title = title;
        this.timestamp = timestamp;
        this.description = desc;
        this.candidate = candidate;
        this.image_url = image_url;
        this.external_url = external_url;
    }

    formattedDate() {
        const a = new Date(this.timestamp * 1000);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const year = a.getFullYear();
        const month = months[a.getMonth()];
        const date = a.getDate();
        const hour = a.getHours();
        const min = a.getMinutes();
        const sec = a.getSeconds();
        return `${month} ${date}, ${year}`;
    }

    createMapMarker(event_location, map, candidate) {
        const june_26_ts = 1561521600;
        const june_27_ts = 1561694399;
        if (this.timestamp < june_26_ts || this.timestamp > june_27_ts) {
            return;
        }

        const organization = candidate_data[this.candidate];
        organization['event_count'] = organization['event_count'] + 1;
        count += 1;

        const icon_url = organization['icon_url'];
        if (!(this.external_url in location_data)){
            console.log(this.external_url);
            location_data[`${this.external_url}`] = event_location;
        }

        const scaled_icon = {
            url: icon_url,
            size: new google.maps.Size(16, 16),
            scaledSize: new google.maps.Size(12, 12),
        };

        const marker = new google.maps.Marker({
            map: map,
            position: event_location,
            candidate: this.candidate,
            event_url: this.external_url,
            timestamp: this.timestamp,
            icon: scaled_icon,
            opacity: 0.5,
        });

        const infowindow = new google.maps.InfoWindow({
            content: this.formattedInfoWindow(),
        });

        marker.addListener('click', function () {
            if (prevInfoWindow) {
                prevInfoWindow.close();
            }
            prevInfoWindow = infowindow;
            infowindow.open(map, marker);
        });

        markers.push(marker);
    }

    createMapMarkerFromQuery(location_query, places_service, map, candidate) {
        const lq = location_query;
        const ps = places_service;
        const m = map;
        const this_event = this;
        const this_candidate = candidate;
        limited(function() {
            const request = {
                query: lq,
                fields: ['geometry'],
            };
            ps.findPlaceFromQuery(request, function (results, status) {
                if (status === 'OK') {
                    this_event.createMapMarker(results[0].geometry.location, m, this_candidate);
                } else if (status === 'OVER_QUERY_LIMIT') {
                    var millisecondsToWait = Math.random() * 5000;
                    setTimeout(function() {
                        // this_event.createMapMarkerFromQuery(location_query, places_service, map, this_candidate);
                    }, millisecondsToWait);

                }
            });
        });
    }


    formattedInfoWindow() {
        return `<div class="text-strato-blue"><img class="featured_image" style="width:100%;" src="${this.image_url}"/><h2 class="mt-3">${this.title}</h2><span class="intro mb-2">${this.formattedDate()} - <a href="${this.external_url}">${this.external_url}</a></span><p>${this.description}</p></div>`
    }


}

let place = null;
let count = 0;
let count_m = 0;
let saved_event = null;

function createMarkersForMobilizeUrl(url, places_service, map, candidate) {
    if (url != null) {
        $.getJSON(url, function (response) {
            createMarkersForMobilizeUrl(response['next'], places_service, map, candidate); // launch for next url
            const data = response['data'];
            $.each(data, function (index, event) {
                const e = new Event(event['title'], event['timeslots'][0]['start_date'], event['description'],
                   candidate, event['featured_image_url'], event['browser_url']);
                if (event && event['location']) {
                    count += 1;
                    if ('location' in event['location']) {
                        const event_loc = new google.maps.LatLng(event['location']['location']['latitude'],
                            event['location']['location']['longitude']);
                        e.createMapMarker(event_loc, map, candidate);
                    }
                    else if (e.external_url in location_data) {
                        console.log(e.external_url, "found")
                        const event_loc = new google.maps.LatLng(location_data[e.external_url]['lat'],
                                                    location_data[e.external_url]['lng']);
                        e.createMapMarker(event_loc, map, candidate);
                    }
                    else {

                        const event_zip = event['location']['postal_code'];
                        const event_locality = event['location']['locality'];
                        const event_region = event['location']['region'];
                        const loc_string = `${event_locality}, ${event_region} ${event_zip}`;
                        console.log(e.external_url, loc_string, "not found");
                        e.createMapMarkerFromQuery(loc_string, places_service, map, candidate);
                    }
                    saved_event = e;
                }

            });
        });
    }
}

function showAllMarkers(bool) {
    for (let i = 0; i < markers.length; i++) {
        if (bool) {
            markers[i].setVisible(true);
        } else {
            markers[i].setVisible(false);
        }
    }
}

function showFutureEvents() {
    const now = Date.now();
    for (let i = 0; i < markers.length; i++) {
        if (markers[i].timestamp * 1000 > now) {
            markers[i].setVisible(true);
        } else {
            markers[i].setVisible(false);
        }
    }
}

function showOnlyCandidate(candidate) {
    for (let i = 0; i < markers.length; i++) {
        if (markers[i].candidate === candidate) {
            markers[i].setVisible(true);
        } else {
            markers[i].setVisible(false);
        }
    }
}

function ShowControl(controlDiv, f, title, map) {

    // Set CSS for the control border.
    var controlUI = document.createElement('div');
    controlUI.style.backgroundColor = '#fff';
    controlUI.style.display = 'block';
    controlUI.style.border = '1px solid #000';
    controlUI.style.cursor = 'pointer';
    controlUI.style.textAlign = 'center';
    controlUI.title = title;
    controlDiv.appendChild(controlUI);

    // Set CSS for the control interior.
    var controlText = document.createElement('div');
    controlText.style.color = 'rgb(25,25,25)';
    controlText.style.fontFamily = 'Roboto,Arial,sans-serif';
    controlText.style.fontSize = '16px';
    controlText.style.lineHeight = '38px';
    controlText.style.paddingLeft = '5px';
    controlText.style.paddingRight = '5px';
    controlText.innerHTML = title;
    controlUI.appendChild(controlText);

    // Setup the click event listeners: simply set the map to Chicago.
    controlUI.addEventListener('click', f);

}

function initMap() {
    $.getJSON("map-options.json", function (mapstyle) {
        map = new google.maps.Map(document.getElementById('map'), {
            zoom: 5,
            center: {lat: 39.8097343, lng: -98.5556199},
            zoomControl: true,
            zoomControlOptions: {
                position: google.maps.ControlPosition.RIGHT_CENTER
            },
            scaleControl: true,
            mapTypeControl: false,
            fullscreenControl: true,
            streetViewControl: false,
            rotateControl: false,
            styles: mapstyle,
        });


        // Create the DIV to hold the control and call the CenterControl()
        // constructor passing in this DIV.
        var centerControlDiv = document.createElement('div');
        centerControlDiv.index = 1;
        map.controls[google.maps.ControlPosition.LEFT_CENTER].push(centerControlDiv);

        // Create global controls
        new ShowControl(centerControlDiv, showAllMarkers, 'Show All', map);
        // new ShowControl(centerControlDiv, showFutureEvents, 'Upcoming', map);
        // new ShowControl(centerControlDiv, showOnlyType("HOUSE_PARTY"), 'Watch Parties', map);

        places_service = new google.maps.places.PlacesService(map); // initialize the places service for location queries

        for (const [candidate, dict] of Object.entries(candidate_data)) {
            // Create filter button
          new ShowControl(centerControlDiv, function () {
            showOnlyCandidate(candidate)
            }, dict['display_name'], map);

            // create markers for organizations
            for (let i = 0; i < dict['organization_ids'].length; i++) {
                const org_id = dict['organization_ids'][i];
                const mobilize_url = `https://api.mobilize.us/v1/organizations/${org_id}/events`; // events api url for mobilize org
                createMarkersForMobilizeUrl(mobilize_url, places_service, map, candidate);
            }
        }
    });
}



