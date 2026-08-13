const express = require('express');
const router = express.Router();
const { authenticate, requireAssociation } = require('../middleware/auth');
const { upload } = require('../lib/cloudinary');
const { getMyAssociation, createGroupe, getGroupe, updateGroupe, uploadMusique } = require('../controllers/associationController');

router.use(authenticate, requireAssociation);

router.get('/me', getMyAssociation);
router.post('/groupes', upload.single('musique'), createGroupe);
router.get('/groupes/:id', getGroupe);
router.put('/groupes/:id', updateGroupe);
router.post('/groupes/:id/musique', upload.single('musique'), uploadMusique);

module.exports = router;
