const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({
    origin: '*', // More permissive CORS
}));

app.get('/health', (req, res) => {
    try {
        res.status(200).send('OK');
    } catch (error) {
        console.error('Error in health endpoint:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Other route handlers and configurations...

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
