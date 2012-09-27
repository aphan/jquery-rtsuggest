( function ( $ ) {

  var methods = {

    init : function( suggestSource, options ) { 
      return this.each( function () {

        var settings = $.extend( {
          requestType: 'GET',
          dataType: 'json',
          topItemsUrl: ''
        }, options );

        var cssClasses = {
          dropdownBox: 'dropdown-box',
          suggestionsList: 'suggestions-list',
          highlightedSuggestion: 'highlighted-suggestion',
          suggestionItem: 'suggestion-item',
          suggestionText: 'suggestion-text'
        };

        $( this ).data( 'rtsuggestSettings', settings );
        $( this ).data( 'rtsuggestCssClasses', cssClasses);
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

  };

} ( jQuery ));






