import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';

const DEFAULT_HANDLERS = [
  'https://www.ebay.co.uk/sch/i.html?_sop=12&_nkw=outdoors&_stpos=cb1&_sacat=0&LH_LocatedIn=GB&_dmd=1&rt=nc&_ipg=240'
];

const ebayScraper = () => {
  const [handlers, setHandlers] = useState(DEFAULT_HANDLERS);
  const [maxProducts, setMaxProducts] = useState(5000);
  const [minSoldItems, setMinSoldItems] = useState(500);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleScrape = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handlers: handlers.filter(h => h.trim() !== ''),
          maxProducts,
          minSoldItems,
        }),
      });

      if (!response.ok) throw new Error('Scraping failed');

      const data = await response.json();
      const filteredResults = data.results.filter(item => item.soldCount >= minSoldItems);
      setResults({
        results: filteredResults,
        debug: {
          ...data.debug,
          filteredResults: filteredResults.length
        }
      });
    } catch (error) {
      console.error('Error scraping:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateHandler = (index, value) => {
    const newHandlers = [...handlers];
    newHandlers[index] = value;
    setHandlers(newHandlers);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <h2 className="text-2xl font-bold">eBay Scraper</h2>
      </CardHeader>
      <CardContent>
        {handlers.map((handler, index) => (
          <Input
            key={index}
            type="text"
            value={handler}
            onChange={(e) => updateHandler(index, e.target.value)}
            placeholder={`Handler ${index + 1}`}
            className="mb-2"
          />
        ))}
        <Input
          type="number"
          value={maxProducts}
          onChange={(e) => setMaxProducts(Number(e.target.value))}
          placeholder="Max products to scrape"
          className="mb-2"
        />
        <Input
          type="number"
          value={minSoldItems}
          onChange={(e) => setMinSoldItems(Number(e.target.value))}
          placeholder="Minimum sold items"
          className="mb-4"
        />
        <Button onClick={handleScrape} disabled={isLoading}>
          {isLoading ? 'Scraping...' : 'Scrape'}
        </Button>
      </CardContent>
      <CardFooter>
        {results && results.results.length > 0 && (
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 w-full">
            {JSON.stringify(results, null, 2)}
          </pre>
        )}
      </CardFooter>
    </Card>
  );
};

export default ebayScraper;
