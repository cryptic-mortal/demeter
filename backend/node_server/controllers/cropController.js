const CropStateSchema = require('../schema/cropSchema');

const createCrop = async (req, res) => {
  try {
    const { crop_id, crop, stage, ...rest } = req.body;

    if (!crop_id) {
      return res.status(400).json({ error: 'crop_id is required' });
    }

    const existingCrop = await CropStateSchema.findOne({ crop_id });
    if (existingCrop) {
      return res.status(409).json({ error: 'Crop with this ID already exists' });
    }

    const newCrop = new CropStateSchema({
      crop_id,
      crop,
      stage: stage || 'seedling',
      sequence_number: 0,
      total_crop_lifetime_days: 0,
      planted_at: new Date(),
      last_updated: new Date(),
      ...rest
    });

    const savedCrop = await newCrop.save();

    res.status(201).json({
      message: 'Crop created successfully',
      data: savedCrop
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAllCrops = async (req, res) => {
  console.log('getAllCrops endpoint called');
  try {
    const crops = await CropStateSchema.find();
    console.log(`Retrieved ${crops.length} crops from the database.`);
    res.status(200).json({
      message: 'Crops retrieved successfully',
      data: crops
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    console.log('getAllCrops endpoint was called');
  }
};

module.exports = { createCrop, getAllCrops };