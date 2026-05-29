//------------------------------------------------------------------------------
// Modularized Sentinel-1 Processing Script for VV, VH, RVI, RFDI, VV/VH
//------------------------------------------------------------------------------

//------------------------------------------------------------------------------
// 0. PARAMETERS
//------------------------------------------------------------------------------
var timeField = 'system:time_start';

// Define your ROIs here
var rois = {
  'vigneto': vigneto,
  'uliveto': uliveto
};

//------------------------------------------------------------------------------
// 1. DATA COLLECTION
//------------------------------------------------------------------------------
function getSentinel1(roi, pols, orbitPass) {
  return ee.ImageCollection("COPERNICUS/S1_GRD")
    .filterBounds(roi)
    .filterMetadata('transmitterReceiverPolarisation','equals', pols)
    .filterMetadata('instrumentMode','equals','IW')
    .filter(ee.Filter.eq('orbitProperties_pass', orbitPass));
}

//------------------------------------------------------------------------------
// 2. LEE ANTI-SPECKLE FILTER
//------------------------------------------------------------------------------
function applyLeeFilter(image) {
  var vv = ee.Image(image).select('VV'),
      vh = ee.Image(image).select('VH');

  // Convert dB to linear
  var vvLin = ee.Image(10).pow(vv.divide(10)),
      vhLin = ee.Image(10).pow(vh.divide(10));

  var kernel = ee.Kernel.square({radius: 1});

  function leeOneBand(bandLin, name) {
    var mean = bandLin.reduceNeighborhood(ee.Reducer.mean(), kernel);
    var variance = bandLin.reduceNeighborhood(ee.Reducer.variance(), kernel);
    var cv = variance.sqrt().divide(mean);
    var k = cv.multiply(cv).divide(cv.multiply(cv).add(0.25));
    var filtered = mean.add(k.multiply(bandLin.subtract(mean)));
    // back to dB
    return ee.Image(10).multiply(filtered.log10()).rename(name);
  }

  var vvF = leeOneBand(vvLin, 'VV'),
      vhF = leeOneBand(vhLin, 'VH');

  return image.addBands([vvF, vhF], null, true);
}

//------------------------------------------------------------------------------
// 3. INDICES CALCULATION
//------------------------------------------------------------------------------
function calculateIndices(image) {
  var vv = image.select('VV'),
      vh = image.select('VH');

  // RVI
  var rvi = vv.divide(vv.add(vh)).sqrt()
               .multiply(vv.divide(vh)).rename('RVI');

  // RFDI
  var vvLin = ee.Image(10).pow(vv.divide(10));
  var vhLin = ee.Image(10).pow(vh.divide(10));
  var rfdi = vvLin.subtract(vhLin)
                   .divide(vvLin.add(vhLin))
                   .rename('RFDI');

  // VV/VH ratio
  var ratio = vv.divide(vh).rename('VV_VH');

  return image.addBands([rvi, rfdi, ratio]);
}

//------------------------------------------------------------------------------
// 4. ENRICH IMAGE WITH ALL VARIABLES
//------------------------------------------------------------------------------
function enrichImage(image) {
  // Apply speckle filter
  var img = applyLeeFilter(image);
  // Compute indices
  img = calculateIndices(img);
  // Add time variables
  var date = ee.Date(img.get(timeField));
  var yearFrac = date.difference(ee.Date('1970-01-01'), 'year');
  var dateOnly = date.format('YYYY-MM-dd');
  var fullDate = date.format('YYYY-MM-dd HH:mm:ss');

  return img.addBands(ee.Image(yearFrac).rename('t'))
            .set('date', dateOnly)
            .set('datetime', fullDate);
}

//------------------------------------------------------------------------------
// 5. CHARTING UTILITIES
//------------------------------------------------------------------------------
function createSeriesChart(collection, roi, bands, title) {
  return ui.Chart.image.series({
    imageCollection: collection.select(bands),
    region: roi,
    scale: 10,
    xProperty: 'datetime'
  })
  .setChartType('ScatterChart')
  .setOptions({
    title: title,
    lineWidth: 1,
    pointSize: 3,
    hAxis: {title: 'Acquisition Date'},
    vAxis: {title: bands.join(', ')}
  });
}

//------------------------------------------------------------------------------
// 6. PROCESS ROI
//------------------------------------------------------------------------------
function processROI(roi, name) {
  print('Processing ROI:', name);
  Map.centerObject(roi);

  // 6.1 Collect and enrich
  var col = getSentinel1(roi, ['VV','VH'], 'ASCENDING')
              .map(enrichImage);

  // 6.2 Display charts
  print(createSeriesChart(col, roi, ['VV'], name + ' - VV'));  
  print(createSeriesChart(col, roi, ['VH'], name + ' - VH'));
  print(createSeriesChart(col, roi, ['VV','VH'], name + ' - VV & VH'));  
  print(createSeriesChart(col, roi, ['RVI'], name + ' - RVI'));  
  print(createSeriesChart(col, roi, ['RFDI'], name + ' - RFDI'));  
  print(createSeriesChart(col, roi, ['RVI','RFDI'], name + ' - RVI & RFDI'));

  // 6.3 Compute mean stats
  var stats = col.map(function(img) {
    var meanDict = img.select(['VV','VH','RVI','RFDI'])
      .reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: roi,
        scale: 10,
        maxPixels: 1e9
      });
    return ee.Feature(roi, meanDict)
      .set('date', img.get('date'))
      .set('datetime', img.get('datetime'));
  });
  print('Statistics for ' + name, stats);
}

//------------------------------------------------------------------------------
// 7. EXECUTION
//------------------------------------------------------------------------------
for (var key in rois) {
  processROI(rois[key], key);
}
