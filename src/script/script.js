; (function() {

  'use strict'

  const CLOSING = {
    ONE: 'Closing within 1 hour',
    TWO: 'Closing within 2 hours'
  };
  const ENTER_KEY = 13;
  const MAX_RESULTS = 3;
  const MAPS = {
    OPEN_NOW: true,
    RADIUS: 2000,
    TYPE: ['restaurant'],
    ZOOM: 13
  };
  const SEARCH_ENDPOINT = 'http://maps.google.com/maps/api/geocode/json';
  const SYMBOLS = {
    DOLLAR: '$',
    FULL_STAR: '&starf;',
    EMPTY_STAR: '&star;'
  };

  let coords = {lat: 0, lng: 0};
  let infoWindow;
  let map;
  let markers = [];
  let service;

  init();

  function init() {
    $('.list').on('click', '.restaurant', e => highlightRestaurant($(e.currentTarget).data('id')));
    $('.search__price').on('click', e => $(e.currentTarget).toggleClass('search__price--toggle'));
    $('.search__query').on('keyup', searchCoords);
    $('.search__submit').on('click', searchCoords);

    initMap();
    getUserCoords();
  }

  function initMap() {
    map = new google.maps.Map(document.getElementsByClassName('map')[0], {
      center: coords,
      zoom: MAPS.ZOOM
    });
    infoWindow = new google.maps.InfoWindow();
    service = new google.maps.places.PlacesService(map);
  }

  function getUserCoords() {
    navigator.geolocation.getCurrentPosition((position) => {
      coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      runSearch();
    });
  }

  function searchCoords(e = {}) {
    if (e.keyCode === ENTER_KEY || e.type === 'click') {
      $.ajax({
        url: SEARCH_ENDPOINT,
        data: {
          address: $('.search__query').val()
        },
        success: function(response) {
          if (response.results) {
            $('.search__query').val(response.results[0].formatted_address)

            coords = {
              lat: response.results[0].geometry.location.lat,
              lng: response.results[0].geometry.location.lng,
            };

            runSearch();
          }
        }
      });
    }
  }

  function runSearch() {
    let {minPrice, maxPrice} = getPrice();
    map.setCenter(coords);

    service.nearbySearch({
      location: coords,
      radius: MAPS.RADIUS,
      openNow: MAPS.OPEN_NOW,
      minPriceLevel: minPrice,
      maxPriceLevel: maxPrice,
      type: MAPS.TYPE
    }, parseSearch);
  }

  function getPrice() {
    let prices = [];
    let ele = $('.search__price--toggle');

    if (ele.length) {
      ele.each((key, ele) => {
        prices.push($(ele).data('price'));
      });

      return { 
        minPrice: prices[0],
        maxPrice: prices[prices.length - 1]
      };
    } else {
      return {
        minPrice: 0,
        maxPrice: 4
      };
    }
  }

  function parseSearch(results, status) {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
      clearSearchResults();

      let length = results.length < MAX_RESULTS ? results.length : MAX_RESULTS;
      results = shuffle(results);

      for (let i = 0; i < length; i++) {
        service.getDetails({
          placeId: results[i].place_id
        }, renderSearchDetails);
      }
    }
  }

  function clearSearchResults() {
    let length = markers.length;

    for (var i = 0; i < length; i++) {
      markers[i].setMap(null);
    }

    markers = [];
    $('.list').empty();
  }

  function renderSearchDetails(place, status) {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
      addMarker(place);
      addRestaurant(place);
    }
  }

  function addMarker(place) {
    let marker = new google.maps.Marker({
      map: map,
      position: place.geometry.location,
      title: place.name,
      id: place.place_id
    });

    markers.push(marker);

    google.maps.event.addListener(marker, 'click', () => {
      highlightRestaurant(place.place_id);
    });
  }

  function addRestaurant(place) {
    let template = document.querySelector('.restaurant-template');
    let clone = document.importNode(template.content, true);

    let address = place.vicinity || '';
    let phone =   place.formatted_phone_number || '';
    let name =    place.name || '';
    let hours =   timeTilClose(place.opening_hours) || '';
    let id = place.place_id || '';
    let rating =  place.rating || '';
    let price =  renderPrice(place.price_level) || '';
    let reviews = place.reviews || '';
    let website = place.website || '';

    $(clone).find('.restaurant').attr('data-id', id);
    $(clone).find('.restaurant__address').html(address);
    $(clone).find('.restaurant__phone').html(phone);
    $(clone).find('.restaurant__name').html(name);
    $(clone).find('.restaurant__closing').html(hours);
    $(clone).find('.restaurant__rating').html(renderStars(rating));
    $(clone).find('.restaurant__price').html(price);
    $(clone).find('.restaurant__website').attr('href', website).html(website);
    
    $('.list').append(clone);
  }

  function renderPrice(price) {
    let symbol = '';
    for (let i=0; i<price; i++) {
      symbol += SYMBOLS.DOLLAR;
    }
    return symbol;
  }

  function renderStars(rating) {
    let stars = '';
    let maxStars = Math.floor(rating);

    for (let i=0; i<5; i++) {
      stars += i<maxStars ? SYMBOLS.FULL_STAR : SYMBOLS.EMPTY_STAR;
    }

    return stars;
  }

  function timeTilClose(hours) {
    let today = new Date();
    let hour = today.getHours();
    let day = today.getDay();
    let closingHour = 0;
    let str = '';

    if (hours && hours.periods && hours.periods.length === 1) { // open 24 hours
      return false;
    } else if (hours && hours.periods && hours.periods[day] && hours.periods[day].close && hours.periods[day].close.hours) {
      closingHour = hours.periods[day].close.hours;
    }

    if (closingHour - hour <= 1) {
      str = CLOSING.ONE;
    } else if (closingHour - hour <= 2) {
      str = CLOSING.TWO;
    }

    return str;
  }

  function highlightRestaurant(id) {
    let length = markers.length;

    // animate markers
    for (let i=0; i<length; i++) {
      if (markers[i].id === id) {
        markers[i].setAnimation(google.maps.Animation.BOUNCE);
      } else {
        markers[i].setAnimation(null);
      }
    }

    // highlight list
    $('.restaurant').removeClass('restaurant--highlight')
    $('.restaurant[data-id=' + id +']').addClass('restaurant--highlight');

    // scroll list into view
    $('.restaurant--highlight')[0].scrollIntoView();
  }

  // taken from: https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
  function shuffle(array) {
    let currentIndex = array.length, temporaryValue, randomIndex;

    while (0 !== currentIndex) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    return array;
  }

  // taken from: https://stackoverflow.com/questions/16055275/html-templates-javascript-polyfills
  (function polyfillTemplate(d) {
    if('content' in d.createElement('template')) {
        return false;
    }

    var qPlates = d.getElementsByTagName('template'),
      plateLen = qPlates.length,
      elPlate,
      qContent,
      contentLen,
      docContent;

    for(var x=0; x<plateLen; ++x) {
      elPlate = qPlates[x];
      qContent = elPlate.childNodes;
      contentLen = qContent.length;
      docContent = d.createDocumentFragment();

      while(qContent[0]) {
          docContent.appendChild(qContent[0]);
      }

      elPlate.content = docContent;
    }
  })(document);

})();