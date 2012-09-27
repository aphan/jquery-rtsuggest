(function ( $ ) {

  var methods = {

    // suggestSource could be:
    // -- A string representing a url (eg "/calling/server?query=") that is a server call 
    // that we can dynamically query whenever the user changes the input form
    // -- A string representing a url (eg "/calling/server/once?query=alltitles") that we just 
    // query once to get a collection of strings to search against for all future input changes.
    // Needs to set callServerOnInputChange to false in this case.
    // -- An array of strings, eg ["item1", "item2", "item3"]
    init : function( suggestSource, options ) { 
      return this.each( function () {

        var settings = $.extend( {
          callServerOnInputChange: false,
          requestType: 'GET',
          dataType: 'json',
          topItemsUrl: ''
        }, options );

        var cssClasses = {
          dropdownBox: 'dropdown-box', // Div around suggestionsList
          suggestionsList: 'suggestions-list',
          highlightedSuggestion: 'highlighted-suggestion',
          suggestionItem: 'suggestion-item',
          suggestionText: 'suggestion-text'
        };

        $( this ).data( 'rtsuggestSettings', settings );
        $( this ).data( 'rtsuggestCssClasses', cssClasses );
        $( this ).data( 'rtsuggestObject', new Suggest(this, suggestSource, settings, cssClasses) );
      });
    }
  };

  $.fn.rtsuggest = function( method ) {
    if ( methods[method] ) {
      return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
    } else if ( typeof method === 'string' || typeof method == 'object' || ! method ) {
      return methods.init.apply( this, arguments );
    } else {
      $.error( 'Method ' +  method + ' does not exist on jQuery.rtsuggest' );
    }    

  };

  // Creates dropdown suggestions box for a form and searches for autocompletions
  // when form's input changes.
  var Suggest = function ( inputForm, suggestSource, settings, cssClasses ) {

    // We check the cache before actually querying the server
    var suggestionsCache = {};
    // The currently highlighted suggestion from the dropdown box
    var highlightedSuggestion = [];
    // The text that the user actually types in the input form.  NOT the same as
    // suggestionInput below, which is the text that they could've selected using the
    // arrow keys from the dropdown box.
    var userInput = '';
    var suggestionInput = '';
    var useUserInput = true;

    var dropdownBox = $( '<div />' ).mouseout( function() {
      highlightedSuggestion = [];  
    }).addClass( cssClasses.dropdownBox ).appendTo( 'body' ).hide();

    // Disable default autocompletion on the input form
    $(inputForm).attr( 'autocomplete', 'off' );

    // Perform an action when the user modifies the input of the form 
    $( inputForm ).keyup( function( event ) {
      switch( event.keyCode ) {
        case 13: // enter key
          $( inputForm ).val( suggestionInput );
          hideDropdownBox();
          break;

        case 27: // escape key
          useUserInput = true;
          userInput = $( inputForm ).val();
          hideDropdownBox();
          break;

        case 38: // up key
        case 40: // down key
          // Remove whatever dropdown item is highlighted (if any)
          if ( !useUserInput && highlightedSuggestion.length != 0 ) {
            removeHighlight( highlightedSuggestion );
          }
          var toHighlight = null;
          // Highlight the first dropdown item if the user presses the down key and no
          // item was highlighted before
          if ( event.keyCode == 40 && (useUserInput || highlightedSuggestion.length == 0) ) {
            useUserInput = false;
            toHighlight = $( '.' + cssClasses.suggestionsList + ' li' ).first();
          } else if ( event.keyCode == 40 ) {
            toHighlight = highlightedSuggestion.next();
            // Highlight the last item if the user presses the up key and no item
            // was highlighted before
          } else if ( event.keyCode == 38 && useUserInput ) {
            useUserInput = false;
            toHighlight = $( '.' + cssClasses.suggestionsList + ' li' ).last();
          } else {
            toHighlight = highlightedSuggestion.prev();
          }

          highlightSuggestion( toHighlight );
          // Change the text in the input form to either be the highlighted item, or
          // whatever the user typed, depending on whether there is anything highlighted
          if ( useUserInput ) {
            $( inputForm ).val( userInput );
          } else {
            $( inputForm ).val( suggestionInput );
          }
          break;

        default:
          if ( String.fromCharCode( event.keyCode ) ) {
            // Don't do anything on a blank input
            if ( !$(inputForm).val() ) {
              hideDropdownBox();
              break;
            }
            var query = $( inputForm ).val();
            getSuggestions( normalizeString(query) );
            userInput = query;
            useUserInput = true;
            highlightedSuggestion = [];
          }
      }

    }).click( function( event ) {
      event.stopPropagation();
      if ( $(inputForm).val() == '' && settings.topItemsUrl ) {
        getSuggestions( '' );
      } else if ( $(inputForm).val() ) {
        var query = $( inputForm ).val();
        getSuggestions( normalizeString(query) );
      }
    });

    // Removes all extra whitespace
    function normalizeString( string ) {
      return $.trim( string ).split( new RegExp('\\s+') ).join( ' ' );
    }

    function highlightSuggestion( suggestion ) {
      useUserInput = ( suggestion.length == 0 );
      suggestion.addClass( cssClasses.highlightedSuggestion );
      highlightedSuggestion = suggestion;
      suggestionInput = suggestion.text();
    }

    function removeHighlight( suggestion ) {
      suggestion.removeClass( cssClasses.highlightedSuggestion );
    }

    function getSuggestions( query ) {
      if ( suggestSource instanceof Array ) {
        arrayQuery( query );
        // only make server call if cached query doesn't exist
      } else if ( suggestionsCache[query] != null ) {
        formatDropdownBox( suggestionsCache[query] );
      } else {
        serverQuery( query );
      }
    }

    function arrayQuery( query ) {
      matchingItems = [];
      var queryRegex = new RegExp( '^' + query );
      $.each( suggestSource, function(i, item ) {
        if ( queryRegex.test( item ) ) {
          matchingItems.push( item );
        }
      });
      formatDropdownBox( matchingItems );
    }

    function serverQuery( query ) {
      var queryUrl = suggestSource;
      if ( settings.callServerOnInputChange ) {
        var queryUrl = suggestSource + query;
      }
      // If there is a specified URL to get top items (for when the
        // user clicks onto a blank form), set the query url to that link
        if ( !query ) {
          queryUrl = settings.topItemsUrl;
        } else if ( !(/\S/.test(query)) ) {
          return;
        }

        $.ajax( {
          url: queryUrl,
          type: settings.requestType,
          dataType: settings.dataType,
          success: function( data ) {
            if ( settings.callServerOnInputChange ) {
              formatDropdownBox( data );
              suggestionsCache[query] = data; // cache results
            } else {
              suggestSource = data; 
              arrayQuery( query );
            }
          }
        });
    }

    function formatDropdownBox( data ) {
      var suggestionsList = $( '<ul />' ).addClass( cssClasses.suggestionsList )
      // selects the nearest dropdown item when the user mouses over the dropdown
      .mouseover( function ( event ) {
        var selectedSuggestion = $( event.target ).closest( 'li' );
        highlightSuggestion( selectedSuggestion );

      }).mouseout( function() {
        removeHighlight( highlightedSuggestion );

        // set the input form's text to be the text of the dropdown item that
        // the user clicks on
      }).click( function ( event ) {
        event.stopPropagation();
        var selectedSuggestion = $( event.target ).closest( 'li' );
        $( inputForm ).val( selectedSuggestion.text() );
        userInput = selectedSuggestion.text();
        useUserInput = true;
        hideDropdownBox();
      });

      $.each(data, function( i, item ) {
        suggestionsList.append( '<li class="' + cssClasses.suggestionItem + '"><span class="' 
        + cssClasses.suggestionText + '">' + item + '</span></li>' );
      });

      // Only show the dropdown box if there are suggestions available
      if ( data.length == 0 ) { 
        hideDropdownBox();
      } else {
        dropdownBox.html( suggestionsList );
        showDropdownBox();
      }
    }

    function showDropdownBox() {
      positionDropdownBox();
      dropdownBox.show();
    }

    function hideDropdownBox() {
      dropdownBox.hide();
      dropdownBox.html( '' );
    } 

    // The dropdown box should change its size accordingly with the position and
    // size of the input form
    $( window ).resize( function() {
      if ( $(dropdownBox).is(':visible') ) {
        positionDropdownBox();
      }
    });

    function positionDropdownBox() {
      $( dropdownBox ).css({
        position: "absolute",
        top: $( inputForm ).offset().top + $( inputForm ).outerHeight() - 1.5,
        left: $(  inputForm ).offset().left,
        width: $( inputForm ).outerWidth() - 1,
        'z-index': 40,
        'font-size': $('#' + inputForm.id).css('font-size')
      });
    }

    // Hide the dropdown when the dropdown is visible and the user clicks anywhere 
    // besides from the dropdown box or the input form, hide 
    $( document ).click( function() {
      useUserInput = true;
      userInput = $( inputForm ).val();
      hideDropdownBox();
    });

  };
} ( jQuery ));
