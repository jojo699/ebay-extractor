const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const validateInput = (handlers, maxProducts, minSoldItems) => {
  if (!Array.isArray(handlers) || handlers.length === 0) {
    throw new Error('Invalid or empty handlers array');
  }
  if (typeof maxProducts !== 'number' || maxProducts <= 0) {
    throw new Error('Invalid maxProducts value');
  }
  if (typeof minSoldItems !== 'number' || minSoldItems < 0) {
    throw new Error('Invalid minSoldItems value');
  }
};

const extractSoldNumber = (soldText) => {
  const match = soldText.match(/(\d+,?\d*)\s+sold/);
  return match ? parseInt(match[1].replace(/,/g, '')) : 0;
};

const scrapeEbayPage = async (url, maxProducts, minSoldItems, debug) => {
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);
  const items = $('.s-item__wrapper');
  debug.totalItems += items.length;

  if (items.length === 0) {
    return { products: [], hasNextPage: false };
  }

  const products = [];
  items.each((index, element) => {
    if (products.length >= maxProducts) return false;

    const title = $(element).find('.s-item__title').text().trim();
    const price = $(element).find('.s-item__price').text().trim();
    const soldCountElement = $(element).find('.s-item__detail--primary .s-item__quantitySold');
    const soldNumber = soldCountElement.length > 0 ? extractSoldNumber(soldCountElement.text().trim()) : 0;
    const url = $(element).find('.s-item__link').attr('href');

    if (soldNumber >= minSoldItems) {
      products.push({ title, price, soldCount: soldNumber, url });
      debug.itemsMatchingCriteria++;
    }
  });

  const hasNextPage = $('.pagination__next').length > 0;
  return { products, hasNextPage };
};

app.post('/api/scrape', async (req, res) => {
  const { handlers, maxProducts, minSoldItems, country, postCode } = req.body;
  const debug = { totalItems: 0, itemsMatchingCriteria: 0 };

  try {
    validateInput(handlers, maxProducts, minSoldItems);

    const results = [];
    for (const handler of handlers) {
      if (typeof handler !== 'string' || !handler.startsWith('https://www.ebay.co.uk/')) {
        console.warn(`Skipping invalid handler: ${handler}`);
        continue;
      }

      let pageNum = 1;
      while (results.length < maxProducts) {
        const url = `${handler}&_pgn=${pageNum}`;
        const { products, hasNextPage } = await scrapeEbayPage(url, maxProducts - results.length, minSoldItems, debug);
        results.push(...products);

        if (!hasNextPage) break;
        pageNum++;
      }
    }

    res.json({
      results,
      debug: {
        ...debug,
        minSoldItems,
        totalResults: results.length,
        country,
        postCode
      }
    });
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ error: 'Scraping failed', details: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


