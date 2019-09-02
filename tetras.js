window.onload = function() {
  // DECLARATIONS

  // Get HTML Elements
  var viewportElement = document.getElementById('viewport');
  var tetrasElement = document.getElementById('scene');
  var scene = Snap('#scene');
  const pi = Math.PI;
  var sqrt = [ 0, 1, Math.sqrt(2), Math.sqrt(3), 2, Math.sqrt(5) ];

  // Get body dimensions and assign corresponding viewBox
  var viewport = {
    x: -viewportElement.offsetWidth / 2,
    y: -viewportElement.offsetHeight / 2,
    width: viewportElement.offsetWidth,
    height: viewportElement.offsetHeight
  }

  var tileSize = 200;
  var tile = {
    width: tileSize,
    height: tileSize / Math.sqrt(3)
  }

  console.log( "tile: ", tile );

  tetrasElement.setAttribute("viewBox", viewport.x + " " + viewport.y + " " + viewport.width + " " + viewport.height );
  tetrasElement.setAttribute("width", viewport.width);
  tetrasElement.setAttribute("height", viewport.height);

  // FUNCTIONS

  // Finds center of a tile from its row and column
  // @param row as int, col as int, tile as obj
  // @return array [ x as float, y as float ]
  function tileOffset( row, col, tile, tilePlaneOffset ) {
    return [ tile.width * col / 2, tile.height * row / 2 ];
  }

  // Generates a point map of the starting position of each tile
  // @param tile as object, viewport as object
  // @return tilePlane
  function makeTilePlane( tile, viewport ) {
    numCols = Math.ceil( 2 * viewport.width / tile.width );
    numRows = Math.ceil( 2 * viewport.height / tile.height );
    planeWidth = Math.ceil( numCols / 2) * tile.width;
    planeHeight = Math.ceil( numRows / 2) * tile.height;
    var tilePlane = {
      rows: numRows,
      cols: numCols,
      width: planeWidth,
      height: planeHeight,
      offset: [ ( viewport.width - planeWidth ) / 2,
                 ( viewport.height - planeHeight ) / 2 ],
      tile: []
    }

    var id = 0;
    for ( var row = -parseInt( numRows / 2, 10 ); row < numRows; row++ ) {
      for ( var col = -parseInt( numCols / 2, 10) + row % 2; col < numCols; col = col + 2 ) {
        tilePlane.tile[id] = {
          row: row,
          col: col,
          offset: tileOffset( row, col, tile, tilePlane.offset )
        }
        id = id + 1;
      }
    }

    return tilePlane;
  }

  function addHexColor(c1, c2) {
    var hexStr = (parseInt(c1, 16) + parseInt(c2, 16)).toString(16);
    while (hexStr.length < 6) { hexStr = '0' + hexStr; } // Zero pad.
    return hexStr;
  }

  // Splits a six digit hex string into three hex values
  // @param hexValue as string
  // @return array of hex integers [ R, G, B ]
  function splitRGB( hexString ) {
    stringArray = hexString.match(/.{2}/g);
    hexArray = stringArray.map( x => parseInt( x, 16) );
    return hexArray;
  }

  // Assigns tetra color based on viewport y value, with higher contrast in lower rows
  // @param y as float
  // @return Array [ colorA as hex string, colorB as hex string ]
  function tetraColor( y, viewport ) {
    var startColor = splitRGB("444444");
    var startContrast = .1;
    var startY = viewport.y;
    var endColor = splitRGB("CCCCCC");
    var endContrast = .03;
    var endY = viewport.y + viewport.height;
    var deltaY = ( -startY + y ) / viewport.height;
    var deltaColor = [0,0,0];
    var deltaContrast = startContrast + deltaY * ( endContrast - startContrast );
    var colorA = [0,0,0], colorB = [0,0,0];
    for ( var i = 0; i < 3; i++ ) {
      deltaColor[i] = parseInt(startColor[i] + deltaY * ( endColor[i] - startColor[i]), 10);
      colorA[i] = parseInt( deltaColor[i] - ( 255 * deltaContrast / 2 ), 10);
      colorB[i] = parseInt( deltaColor[i] + ( 255 * deltaContrast / 2 ), 10);
      if ( colorA[i] > 255 ) { colorA[i] = 255 } else if ( colorA[i] < 0 ) { colorA[i] = 0 };
      if ( colorB[i] > 255 ) { colorB[i] = 255 } else if ( colorB[i] < 0 ) { colorB[i] = 0 };
    }
    return [
      "#" + colorA[0].toString(16) + colorA[1].toString(16) + colorA[2].toString(16),
      "#" + colorB[0].toString(16) + colorB[1].toString(16) + colorB[2].toString(16)
    ];
  }

  // Creates a point a random distance along a line segment
  // @param pointA as [ x, y ], pointB as [ x, y ]
  // @return point C as [ x, y ]
  function breakLine( pointA, pointB ) {
    // console.log( pointA, pointB );
    // slope = ( pointB[1] - pointA[1] ) / ( pointB[0] - pointA[0] );
    var deltaAB = [ pointB[0] - pointA[0], pointB[1] - pointA[1] ];
    var distAB = Math.sqrt( Math.pow( deltaAB[0], 2 ) + Math.pow( deltaAB[1], 2 ));
    var deltaDistAC = ( .2 + .6 * Math.random());
    var deltaAC = deltaAB.map( coord => coord * deltaDistAC );
    return [ pointA[0] + deltaAC[0], pointA[1] + deltaAC[1] ];
  }

  // Sets elevation as a function of y position
  // @param y as float
  // @return elevation as float
  function elevate( y ) {
    minElev = tile.height * 2;
    maxElev = tile.height * 3;
    diffElev = maxElev - minElev;
    deltaY = ( -viewport.x + y ) / viewport.height;
    // console.log( y, minElev, maxElev, diffElev, deltaY );
    return minElev * deltaY;
  }

  // Generates svg object of one terra
  // @param tile as object, offset as array [ x, y ], elevation as float,
  //         tetraColor as Array [ colorA as hexString, colorB as hexString ]
  // @return tetra Snap svg object
  function drawTetra( tile, offset, elevation, tetraColor ) {
    var shift = .2 * tile.width;
    var a = [ offset[0] - tile.width / 2, offset[1] ];
    var b = [ offset[0], offset[1] - tile.height / 2 ];
    var c = [ offset[0] + tile.width / 2, offset[1] ];
    var g = pointShift( [ offset[0], offset[1] + elevate( offset[1] ) ], shift );
    var d = pointShift( breakLine( a, g ), shift );
    var e = pointShift( breakLine( b, g ), shift );
    var f = pointShift( breakLine( c, g ), shift );
    var ground = scene.polygon( a, b, c, f, g, d ).attr({ fill: tetraColor[0] });
    var faceA = scene.polygon( a, b, e, g, d ).attr({ fill: tetraColor[0] });
    var faceB = scene.polygon( b, c, f, g, e ).attr({ fill: tetraColor[1] });
    return scene.g( ground, faceB, faceA );
  }

  // Moves a point within a radius determined by shift, a percentage of the tileWidth
  // @param point as Array [ x, y ], radius as float
  // @return point as Array [ x, y ]
  function pointShift( point, maxRadius ) {
    var rad = Math.random() * maxRadius;
    var th = Math.random() * 2 * pi;
    return [ point[0] + rad * Math.cos(th), point[1] + rad * Math.sin(th) ];
  }

  // Generates an svg path string of the specified arc
  // @param circle { center as [ x, y ], radius as float, arc as [ startRadian, endRadian ] }
  // @return svg path string
  function arcString( circle ) {
    return Snap.format("A{rx},{ry} {x_axis_rotation} {large_arc_flag} {sweep_flag} {x1},{y1}", {
      rx: circle.radius,
      ry: circle.radius,
      x_axis_rotation: 0,
      large_arc_flag: 0,
      sweep_flag: 1,
      x1: circle.center[0] + circle.radius * Math.cos( circle.arc[1] ),
      y1: circle.center[1] + circle.radius * Math.sin( circle.arc[1] )
    })
  }

  // Draws a Serlio's ellipse at the tile location
  // @param offset    [ x, y ]
  // @param width     width in pixels
  // @param cssClass  class to assign SVG element
  // @return SVG object
  function drawSerlio( offset, width, cssClass ) {
    let circle = [];
    circle[0] = {
      center: [ offset[0] - 1 * width / 6, offset[1] ],
      radius: 1/6 * width,
      arc: [ 2 * pi / 3, 4 * pi / 3 ]
    }

    circle[1] = {
      center: [ offset[0], offset[1] + width / ( 2 * sqrt[3]) ],
      radius: 1/2 * width,
      arc: [ 4 * pi / 3, 5 * pi / 3 ]
    }

    circle[2] = {
      center: [ offset[0] + 1/6 * width, offset[1] ],
      radius: 1/6 * width,
      arc: [ 5 * pi / 3, pi / 3]
    }

    circle[3] = {
      center: [ offset[0], offset[1] - width / (2 * sqrt[3]) ],
      radius: 1/2 * width,
      arc: [ pi / 3, 2 * pi / 3 ]
    }

    let arc = circle.map( circ => arcString( circ ));

    x0 = circle[0].center[0] + circle[0].radius * Math.cos( circle[0].arc[0] );
    y0 = circle[0].center[1] + circle[0].radius * Math.sin( circle[0].arc[0] );
 
    return scene.path( "M" + x0 + "," + y0 + " " + arc[0] + arc[1] + arc[2] + arc[3] + "z" ).attr({
      fill: radiationColor,
      class: "serlio " + cssClass});
  }

  var background = scene.rect( viewport.x, viewport.y, viewport.width, viewport.height ).attr({
    fill: scene.gradient( Snap.format( "l({x0}, {y0}, {x1}, {y1}){colorA}-{colorB}", {
      x0: 0,
      y0: 0,
      x1: 0,
      y1: 1,
      colorA: tetraColor( viewport.y, viewport )[0],
      colorB: tetraColor( viewport.y + viewport.height, viewport )[0]
    }))
  });

  // Function to find place chromatic radiation points
  // @param   set
  // @param   bands as int
  // @return  epicenter as array [x, y]
  function placeRadiation(set, bands) {
    let randomTileIndex = parseInt(Math.random() * tilePlane.tile.length, 10);
    let epicenter = [tilePlane.tile[randomTileIndex].offset[0] - (tile.width / 2), tilePlane.tile[randomTileIndex].offset[1]];
    let bandArray = new Array(bands)

    for (let i = 0; i < bands; i++) {
      bandArray[i] = drawSerlio(epicenter, tile.width, 'epicenter-' + set + ' ' + 'delay-' + i )
    }

    return bandArray;
  }
  
  var tilePlane = makeTilePlane( tile, viewport );
  
  var tetra = [];
  for ( var id = tilePlane.tile.length - 1; id >= 0; id = id - 1 ) {
    tetra[id] = drawTetra( tile, tilePlane.tile[id].offset, 100, tetraColor( tilePlane.tile[id].offset[1], viewport ) );
  }

  // const radiationBands = 5;
  const radiationColor = '#122499';
  // let radiationFieldArray = [];
  // radiationFieldArray[0] = placeRadiation(0, radiationBands);
  // for (let i = 0; i < radiationBands; i++) {
  //   radiationFieldArray[0][i].transform('scale(0.01, 0.01)');
  // }

  var serlio0 = drawSerlio( [0,0], tile.width, 'delay-0');

  console.log( "viewport: ", viewport);
  console.log( "tilePlane: ", tilePlane);
  console.log( "tetra: ", tetra );
  console.log( "splitRGB: ", splitRGB("FFFFFF") );
  console.log( "tetraColor: ", tetraColor( 0, viewport ) );
  console.log( "radiationFieldArray: ", radiationFieldArray);
};
