window.onload = function() {
  // DECLARATIONS

  // Get Elements
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
  // Params: row as int, col as int, tile as obj
  // Returns: array [ x as float, y as float ]
  function tileOffset( row, col, tile, tilePlaneOffset ) {
    return [ tile.width * col / 2, tile.height * row / 2 ];
  }

  // Generates a point map of the starting position of each tile
  // Params: tile as object, viewport as object
  // Returns: tilePlane
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
  // Params: hexValue as string
  // Returns: array of hex integers [ R, G, B ]
  function splitRGB( hexString ) {
    stringArray = hexString.match(/.{2}/g);
    hexArray = stringArray.map( x => parseInt( x, 16) );
    return hexArray;
  }

  // Assigns tetra color based on viewport y value, with higher contrast in lower rows
  // Params: y as float
  // Returns: Array [ colorA as hex string, colorB as hex string ]
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
  // Params: pointA as [ x, y ], pointB as [ x, y ]
  // Returns: point C as [ x, y ]
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
  // Params: y as float
  // Returns: elevation as float
  function elevate( y ) {
    minElev = tile.height * 2;
    maxElev = tile.height * 3;
    diffElev = maxElev - minElev;
    deltaY = ( -viewport.x + y ) / viewport.height;
    // console.log( y, minElev, maxElev, diffElev, deltaY );
    return minElev * deltaY;
  }

  // Generates svg object of one terra
  // Params: tile as object, offset as array [ x, y ], elevation as float,
  //         tetraColor as Array [ colorA as hexString, colorB as hexString ]
  // Returns: tetra Snap svg object
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
  // Params: point as Array [ x, y ], radius as float
  // Returns: point as Array [ x, y ]
  function pointShift( point, maxRadius ) {
    var rad = Math.random() * maxRadius;
    var th = Math.random() * 2 * pi;
    return [ point[0] + rad * Math.cos(th), point[1] + rad * Math.sin(th) ];
  }

  // Generates an svg path string of the specified arc
  // Params: circle { center as [ x, y ], radius as float, arc as [ startRadian, endRadian ] }
  // Returns: svg path string
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
  // Params: offset [ x, y ], width, color
  // Returns: SVG object
  function drawSerlio( offset, width, color, opacity ) {
    var circle = [];
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

    var arc = circle.map( circ => arcString( circ ));

    x0 = circle[0].center[0] + circle[0].radius * Math.cos( circle[0].arc[0] );
    y0 = circle[0].center[1] + circle[0].radius * Math.sin( circle[0].arc[0] );
    return scene.path( "M" + x0 + "," + y0 + " " + arc[0] + arc[1] + arc[2] + arc[3] + "z" ).attr({fill: color, opacity: opacity, class: "serlio" });

    // return scene.path(Snap.format("M{x0} {y0}", {
    //   x0: offset[0] + circle.center[0] + circle.radius * Math.cos( circle.arc[0] ),
    //   y0: offset[1] + circle.center[1] + circle.radius * Math.sin( circle.arc[0] ),
    // }) + arc[0] + arc[1] + arc[2] + arc[3]).attr( { fill: color } );
  }

  // Animates a series of Serlio's Ellipse into a radiating field of color
  // Params: offset [ x, y ], width as float

  function chromaticRadiation( offset, width ) {
    // var serlio = []
    // for ( var i = 0; i < 4; i++ ) {
      window.serlio0 = drawSerlio( [ offset[0], offset[1] - tile.height ], width / 10, "#6666FF", 0);
      var startMatrix = new Snap.matrix();
      startMatrix.translate( 0, 0 );
      startMatrix.scale(10);
      var endMatrix = new Snap.matrix;
      endMatrix.translate( 0, tile.height * 4 );
      endMatrix.scale(80);
      startTransform = function() { window.serlio0.animate( { transform: endMatrix, opacity: 0 }, 20000 ); };
      window.serlio0.animate( { transform: startMatrix, opacity: .2 }, 1000, mina.linear(), startTransform  );

      // return serlio0;
    // }
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

  var tilePlane = makeTilePlane( tile, viewport );
  var tetra = [];
  for ( var id = tilePlane.tile.length - 1; id >= 0; id = id - 1 ) {
    tetra[id] = drawTetra( tile, tilePlane.tile[id].offset, 100, tetraColor( tilePlane.tile[id].offset[1], viewport ) );
  }

  // chromaticRadiation( [ 0, 0 ], tile.width );

  var serlio0 = drawSerlio( [0,0], tile.width, "#6666FF", 1);

  // var serlio0 = drawSerlio( [ 0, -200 + 1 * tile.height ], tile.width * 2, "#66F", .2);
  // var serlio1 = serlio0;
  // var serlio2 = drawSerlio( [ 0, -200 + 2 * tile.height ], tile.width * 4, "#88F", .175);
  // var serlio3 = drawSerlio( [ 0, -200 + 3 * tile.height ], tile.width * 6, "#AAF", .15);

  // serlioMatrix = new Snap.matrix();
  // serlioMatrix.translate( 0, 4 * tile.height );
  // serlioMatrix.scale(4);

  // serlio1.animate({ transform: serlioMatrix, opacity: 0 }, 10000 );

  // var tetra0 = tetraMap.polygon([10, 10], [100, 100], [10, 50]).attr({ fill: "black" });
  console.log( "viewport: ", viewport);
  console.log( "tilePlane: ", tilePlane);
  console.log( "tetra: ", tetra );
  console.log( "splitRGB: ", splitRGB("FFFFFF") );
  console.log( "tetraColor: ", tetraColor( 0, viewport ) );
};
