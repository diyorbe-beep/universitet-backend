const express = require('express');
const router = express.Router();

// Mock suggestions storage (in real app, use database)
let suggestions = [];

// GET all suggestions (for admin)
router.get('/', async (req, res) => {
  try {
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: 'Takliflarni olishda xatolik' });
  }
});

// POST create suggestion
router.post('/', async (req, res) => {
  try {
    const { title, category, content, author, email, status = 'pending' } = req.body;
    
    if (!title || !category || !content || !author || !email) {
      return res.status(400).json({ error: 'Barcha maydonlar to\'ldirilishi shart' });
    }
    
    const newSuggestion = {
      _id: Date.now().toString(),
      title,
      category,
      content,
      author,
      email,
      status,
      createdAt: new Date().toISOString(),
      image: `https://picsum.photos/id/${Math.floor(Math.random() * 1000)}/500/300`
    };
    
    suggestions.unshift(newSuggestion);
    
    // In real app, you would send email notification to admin here
    console.log(`📧 Yangi taklif: "${title}" - ${author} (${email})`);
    
    res.status(201).json({
      message: 'Taklif muvaffaqiyatli yuborildi. Admin tasdiqlagach, bu yangilik saytda ko\'rinadi.',
      suggestion: newSuggestion
    });
  } catch (error) {
    res.status(500).json({ error: 'Taklif qo\'shishda xatolik' });
  }
});

// PUT approve/reject suggestion
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approvedBy } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Noto\'g\'ri status' });
    }
    
    const suggestionIndex = suggestions.findIndex(s => s._id === id);
    if (suggestionIndex === -1) {
      return res.status(404).json({ error: 'Taklif topilmadi' });
    }
    
    const updatedSuggestion = {
      ...suggestions[suggestionIndex],
      status,
      approvedBy,
      updatedAt: new Date().toISOString()
    };
    
    suggestions[suggestionIndex] = updatedSuggestion;
    
    // If approved, convert to news
    if (status === 'approved') {
      const newsData = {
        _id: `news_${Date.now()}`,
        title: updatedSuggestion.title,
        category: updatedSuggestion.category,
        shortDesc: updatedSuggestion.content.substring(0, 150) + '...',
        fullContent: updatedSuggestion.content,
        image: updatedSuggestion.image,
        author: updatedSuggestion.author,
        date: new Date().toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' }),
        createdAt: new Date().toISOString(),
        fromSuggestion: true
      };
      
      // Add to news (in real app, this would be a database operation)
      const news = require('./routes.news');
      if (news && news.addNewsItem) {
        news.addNewsItem(newsData);
      }
    }
    
    res.json(updatedSuggestion);
  } catch (error) {
    res.status(500).json({ error: 'Taklifni yangilashda xatolik' });
  }
});

// DELETE suggestion
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const suggestionIndex = suggestions.findIndex(s => s._id === id);
    if (suggestionIndex === -1) {
      return res.status(404).json({ error: 'Taklif topilmadi' });
    }
    
    suggestions.splice(suggestionIndex, 1);
    res.json({ message: 'Taklif muvaffaqiyatli o\'chirildi' });
  } catch (error) {
    res.status(500).json({ error: 'Taklifni o\'chirishda xatolik' });
  }
});

module.exports = router;
