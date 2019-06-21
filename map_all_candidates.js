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
        icon_url: "map-icon-yellow.png",
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
        icon_url: "map-icon-green.png",
        event_count: 0,
        display_name: "Buttigieg",
        organization_ids: ["1297"]
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

    createMapMarker(event_location, map){
        const organization = candidate_data[this.candidate];
        const icon_url = organization['icon_url'];
        organization['event_count'] = organization['event_count'] + 1

        const scaled_icon = {
            url: icon_url,
            size: new google.maps.Size(16, 16),
            scaledSize: new google.maps.Size(12, 12),
        };

        const marker = new google.maps.Marker({
            map: map,
            position: event_location,
            candidate: this.candidate,
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

    createMapMarkerFromQuery(location_query, places_service, map) {
        const this_event = this; // declare for use in nested function
        const request = {
            query: location_query,
            fields: ['geometry'],
        };
        places_service.findPlaceFromQuery(request, function (results, status) {
            if (status === 'OK') {
                this_event.createMapMarker(results[0].geometry.location, map);
            }
        });
    }


    formattedInfoWindow() {
        return `<div class="text-strato-blue"><img class="featured_image" style="width:100%;" src="${this.image_url}"/><h2 class="mt-3">${candidate_data[this.candidate]['display_name']} - ${this.title}</h2><span class="intro mb-2">${this.formattedDate()} - <a href="${this.external_url}">${this.external_url}</a></span><p>${this.description}</p></div>`
    }


}

function createMarkersForMobilizeUrl(url, places_service, map, candidate) {
    if (url != null) {
        $.getJSON(url, function (response) {
            createMarkersForMobilizeUrl(response['next'], places_service, map, candidate); // launch for next url
            const data = response['data'];
            $.each(data, function (index, event) {
                const e = new Event(event['title'], event['timeslots'][0]['start_date'], event['description'],
                    candidate, event['featured_image_url'], event['browser_url'], candidate);
                if (event && event['location']) {
                    if ('location' in event['location']) {
                        const event_loc = new google.maps.LatLng(event['location']['location']['latitude'],
                            event['location']['location']['longitude']);
                        e.createMapMarker(event_loc, map);
                    } else {
                        const event_zip = event['location']['postal_code'];
                        e.createMapMarkerFromQuery(event_zip, places_service, map);
                    }
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
        new ShowControl(centerControlDiv, showFutureEvents, 'Upcoming', map);

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



