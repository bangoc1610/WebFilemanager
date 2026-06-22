const express = require('express');
const router = express.Router();
const { readJSON } = require('../utils/storage');

router.get('/files', (req, res) => res.json(readJSON('files')));
router.get('/groups', (req, res) => res.json(readJSON('groups')));
router.get('/categories', (req, res) => res.json(readJSON('categories')));

module.exports = router;
