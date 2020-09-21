const got = require('got');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const ObjectsToCsv = require('objects-to-csv');
const resultData = [];

/**
 * Get an url and create a JSDOM Object to manipulate it
 * @param {*} url string
 */
async function getPage (url) {
  return new Promise((resolve, reject) => got(url)
    .then(response => {
      const dom = new JSDOM(response.body);
      return resolve(dom)
    })
    .catch( err => {
      console.log('error', err);
      reject(err);
    })
  )
}

/**
 * Get unique objects (same product and same seller)
 * @param {*} items Array of products
 */
function itemsToProducts(items) {
  const productsString = [];
  const productsKey = [];
  items.forEach(item => {
    const key = productsString.indexOf(`${item.product}-${item.seller}`);
    if (key === -1) {
      productsString.push(`${item.product}-${item.seller}`);
      productsKey.push(key);
    }
  });
  const products = [];
  items.forEach((item, index) => {
    if (productsKey.includes(index) > -1) {
      products.push(item);
    }
  });
  return products;
}

/**
 * Main rutine
 * @param {*} url string 
 * @param {*} currentPage number
 * @param {*} pages number
 */
async function main(url, currentPage, pages) {
  console.log('Scrapping', url);
  // get jsdom data
  const data = await getPage(url);
  // get all products as NodeList 
  data.window.document.querySelectorAll('li.ui-search-layout__item div.ui-search-result__wrapper div.ui-search-item__group.ui-search-item__group--title').forEach((element) => {
    resultData.push({
      product: element.firstChild.text,
      url: element.firstChild.href,
      seller: element.firstChild.text === element.lastChild.text ? null : element.lastChild.text
    });
  });

  if (currentPage !== pages) {
    const nextUrl = data.window.document.querySelector('li.andes-pagination__button.andes-pagination__button--current').nextElementSibling.firstChild.href;
    // get next page 
    return main(nextUrl, currentPage + 1, pages);
  } else {
    // generate items.csv
    const items = new ObjectsToCsv(resultData);
    await items.toDisk('./items.csv');

    // generate products.csv (filtered)
    const newData = itemsToProducts(resultData);
    const products = new ObjectsToCsv(newData);
    await products.toDisk('./products.csv');

    console.log('\n===========\nFINAL RESULT');
    console.log(`ITEMS COUNT: ${resultData.length}`);
    console.log(`PRODUCTS COUNT: ${newData.length}`);
    return;
  }
}

(() => {
  // get env variables
  const {search, pages} = process.env;
  const url= `https://listado.mercadolibre.com.co/${search}#D[A:${search}]`;

  main(url, 1, +pages);
})();


