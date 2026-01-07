const express = require('express');
const router = express.Router();

const mainController = require('../../controllers/mainController');

router.get('/', mainController.getHome);
router.get('/filter', mainController.getFilter);
router.get('/search', mainController.getSearch);
router.get('/movie/:id', mainController.getMovie);
router.get('/tv/:id', mainController.getTV);
router.get('/details/:type/:id', mainController.redirectDetails);

module.exports = router;