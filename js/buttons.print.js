/*!
 * Print button for Buttons and DataTables.
 * 2016 SpryMedia Ltd - datatables.net/license
 */

(function( factory ){
	if ( typeof define === 'function' && define.amd ) {
		// AMD
		define( ['jquery', 'datatables.net', 'datatables.net-buttons'], function ( $ ) {
			return factory( $, window, document );
		} );
	}
	else if ( typeof exports === 'object' ) {
		// CommonJS
		module.exports = function (root, $) {
			if ( ! root ) {
				root = window;
			}

			if ( ! $ || ! $.fn.dataTable ) {
				$ = require('datatables.net')(root, $).$;
			}

			if ( ! $.fn.dataTable.Buttons ) {
				require('datatables.net-buttons')(root, $);
			}

			return factory( $, root, root.document );
		};
	}
	else {
		// Browser
		factory( jQuery, window, document );
	}
}(function( $, window, document, undefined ) {
'use strict';
var DataTable = $.fn.dataTable;

var _fnGetHeaders = function(dt) {
    var thRows = $(dt.header()[0]).children();
    var numRows = thRows.length;
    var matrix = [];

    // Iterate over each row of the header and add information to matrix.
    for ( var rowIdx = 0;  rowIdx < numRows;  rowIdx++ ) {
        var $row = $(thRows[rowIdx]);

        // Iterate over actual columns specified in this row.
        var $ths = $row.children("th");
        for ( var colIdx = 0;  colIdx < $ths.length;  colIdx++ )
        {
            var $th = $($ths.get(colIdx));
            var colspan = $th.attr("colspan") || 1;
            var rowspan = $th.attr("rowspan") || 1;
            var colCount = 0;

            // ----- add this cell's title to the matrix
            if (matrix[rowIdx] === undefined) {
                matrix[rowIdx] = [];  // create array for this row
            }
            // find 1st empty cell
            for ( var j = 0;  j < (matrix[rowIdx]).length;  j++, colCount++ ) {
                if ( matrix[rowIdx][j] === "PLACEHOLDER" ) {
                    break;
                }
            }
            var myColCount = colCount;
            matrix[rowIdx][colCount++] = $th.text();

            // ----- If title cell has colspan, add empty titles for extra cell width.
            for ( var j = 1;  j < colspan;  j++ ) {
                matrix[rowIdx][colCount++] = "";
            }

            // ----- If title cell has rowspan, add empty titles for extra cell height.
            for ( var i = 1;  i < rowspan;  i++ ) {
                var thisRow = rowIdx+i;
                if ( matrix[thisRow] === undefined ) {
                    matrix[thisRow] = [];
                }
                // First add placeholder text for any previous columns.                 
                for ( var j = (matrix[thisRow]).length;  j < myColCount;  j++ ) {
                    matrix[thisRow][j] = "PLACEHOLDER";
                }
                for ( var j = 0;  j < colspan;  j++ ) {  // and empty for my columns
                    matrix[thisRow][myColCount+j] = "";
                }
            }
        }
    }

    return matrix;
};


var _link = document.createElement( 'a' );

/**
 * Clone link and style tags, taking into account the need to change the source
 * path.
 *
 * @param  {node}     el Element to convert
 */
var _styleToAbs = function( el ) {
	var url;
	var clone = $(el).clone()[0];
	var linkHost;

	if ( clone.nodeName.toLowerCase() === 'link' ) {
		clone.href = _relToAbs( clone.href );
	}

	return clone.outerHTML;
};

/**
 * Convert a URL from a relative to an absolute address so it will work
 * correctly in the popup window which has no base URL.
 *
 * @param  {string} href URL
 */
var _relToAbs = function( href ) {
	// Assign to a link on the original page so the browser will do all the
	// hard work of figuring out where the file actually is
	_link.href = href;
	var linkHost = _link.host;

	// IE doesn't have a trailing slash on the host
	// Chrome has it on the pathname
	if ( linkHost.indexOf('/') === -1 && _link.pathname.indexOf('/') !== 0) {
		linkHost += '/';
	}

	return _link.protocol+"//"+linkHost+_link.pathname+_link.search;
};


DataTable.ext.buttons.print = {
	className: 'buttons-print',

	text: function ( dt ) {
		return dt.i18n( 'buttons.print', 'Print' );
	},

	action: function ( e, dt, button, config ) {
		var data = dt.buttons.exportData(
			$.extend( {decodeEntities: false}, config.exportOptions ) // XSS protection
		);
		var exportInfo = dt.buttons.exportInfo( config );

		var addRow = function ( d, tag ) {
			var str = '<tr>';

			for ( var i=0, ien=d.length ; i<ien ; i++ ) {
				str += '<'+tag+'>'+d[i]+'</'+tag+'>';
			}

			return str + '</tr>';
		};

		// Construct a table for printing
		var html = '<table class="'+dt.table().node().className+'">';

		

		if ( config.header ) {
			html += '<thead>';
			var headerMatrix = _fnGetHeaders(dt);
			for ( var rowIdx = 0;  rowIdx < headerMatrix.length;  rowIdx++ ) {
				html += addRow( headerMatrix[rowIdx], 'th' );
			}

			html += '</thead>';
		}

		html += '<tbody>';
		for ( var i=0, ien=data.body.length ; i<ien ; i++ ) {
			html += addRow( data.body[i], 'td' );
		}
		html += '</tbody>';

		if ( config.footer && data.footer ) {
			html += '<tfoot>'+ addRow( data.footer, 'th' ) +'</tfoot>';
		}
		html += '</table>';

		// Open a new window for the printable table
		var win = window.open( '', '' );
		win.document.close();

		// Inject the title and also a copy of the style and link tags from this
		// document so the table can retain its base styling. Note that we have
		// to use string manipulation as IE won't allow elements to be created
		// in the host document and then appended to the new window.
		var head = '<title>'+exportInfo.title+'</title>';
		$('style, link').each( function () {
			head += _styleToAbs( this );
		} );

		try {
			win.document.head.innerHTML = head; // Work around for Edge
		}
		catch (e) {
			$(win.document.head).html( head ); // Old IE
		}

		// Inject the table and other surrounding information
		win.document.body.innerHTML =
			'<h1>'+exportInfo.title+'</h1>'+
			'<div>'+(exportInfo.messageTop || '')+'</div>'+
			html+
			'<div>'+(exportInfo.messageBottom || '')+'</div>';

		$(win.document.body).addClass('dt-print-view');

		$('img', win.document.body).each( function ( i, img ) {
			img.setAttribute( 'src', _relToAbs( img.getAttribute('src') ) );
		} );

		if ( config.customize ) {
			config.customize( win );
		}

		// Allow stylesheets time to load
		setTimeout( function () {
			if ( config.autoPrint ) {
				win.print(); // blocking - so close will not
				win.close(); // execute until this is done
			}
		}, 1000 );
	},

	title: '*',

	messageTop: '*',

	messageBottom: '*',

	exportOptions: {},

	header: true,

	footer: false,

	autoPrint: true,

	customize: null
};


return DataTable.Buttons;
}));
