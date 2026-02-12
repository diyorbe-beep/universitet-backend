const express = require('express');
const router = express.Router();

// Mock news storage (in real app, use database)
let news = [
  {
    _id: '1',
    title: 'Platforma yangi funksiyalar bilan boyidi!',
    category: 'Platforma',
    shortDesc: 'ASTI platformasiga yangi xizmatlar qo\'shildi.',
    fullContent: 'ASTI platformasiga yangi xizmatlar qo\'shildi. Endi foydalanuvchilar ko\'proq imkoniyatlardan foydalanishlari mumkin.',
    image: 'https://picsum.photos/id/1/500/300',
    author: 'Admin',
    date: '2024-yil 15-yanvar',
    createdAt: new Date().toISOString()
  }
];

// GET all news
router.get('/', async (req, res) => {
  try {
    res.json(news);
  } catch (error) {
    res.status(500).json({ error: 'Yangiliklarni olishda xatolik' });
  }
});

// POST create news
router.post('/', async (req, res) => {
  try {
    const { title, category, shortDesc, fullContent, image, author, date } = req.body;
    
    if (!title || !category || !shortDesc || !fullContent || !author) {
      return res.status(400).json({ error: 'Barcha maydonlar to\'ldirilishi shart' });
    }
    
    const newNews = {
      _id: Date.now().toString(),
      title,
      category,
      shortDesc,
      fullContent,
      image: image || `https://picsum.photos/id/${Math.floor(Math.random() * 1000)}/500/300`,
      author,
      date: date || new Date().toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' }),
      createdAt: new Date().toISOString()
    };
    
    news.unshift(newNews);
    res.status(201).json(newNews);
  } catch (error) {
    res.status(500).json({ error: 'Yangilik qo\'shishda xatolik' });
  }
});

// PUT update news
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, shortDesc, fullContent, image, author } = req.body;
    
    const newsIndex = news.findIndex(n => n._id === id);
    if (newsIndex === -1) {
      return res.status(404).json({ error: 'Yangilik topilmadi' });
    }
    
    const updatedNews = {
      ...news[newsIndex],
      title: title || news[newsIndex].title,
      category: category || news[newsIndex].category,
      shortDesc: shortDesc || news[newsIndex].shortDesc,
      fullContent: fullContent || news[newsIndex].fullContent,
      image: image || news[newsIndex].image,
      author: author || news[newsIndex].author,
      updatedAt: new Date().toISOString()
    };
    
    news[newsIndex] = updatedNews;
    res.json(updatedNews);
  } catch (error) {
    res.status(500).json({ error: 'Yangilikni yangilashda xatolik' });
  }
});

// DELETE news
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const newsIndex = news.findIndex(n => n._id === id);
    if (newsIndex === -1) {
      return res.status(404).json({ error: 'Yangilik topilmadi' });
    }
    
    news.splice(newsIndex, 1);
    res.json({ message: 'Yangilik muvaffaqiyatli o\'chirildi' });
  } catch (error) {
    res.status(500).json({ error: 'Yangilikni o\'chirishda xatolik' });
  }
});

// Helper function to add news item (used by suggestions)
function addNewsItem(newsItem) {
  news.unshift(newsItem);
}

module.exports = router;
module.exports.addNewsItem = addNewsItem;
