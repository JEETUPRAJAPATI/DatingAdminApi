import User from '../models/userModel.js';
import AppRating from '../models/appRatingModel.js';

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();

    if (!user) {
      return res.status(404).json({
        status: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: true,
      profile: {
        id: user._id,
        fullname: user.name,
        email: user.email,
        mobile: user.mobile,
        about: user.about,
        age: user.age,
        gender: user.i_am,
        interests: user.interests || [],
        likes: user.likes || [],
        hobbies: user.hobbies || [],
        category: user.category,
        profile_image: user.profile_image,
        skin_color: user.skin_color,
        height: user.height,
        weight: user.weight,
        address: user.address,
        subscription: user.subscription,
        status: user.status
      }
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message
    });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    // Delete user and related data
    await Promise.all([
      User.findByIdAndDelete(userId),
      AppRating.deleteMany({ user_id: userId })
      // Add other related data deletion here
    ]);

    res.status(200).json({
      status: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message
    });
  }
};

export const rateApp = async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    const userId = req.user._id;

    // Check if user has already rated
    const existingRating = await AppRating.findOne({ user_id: userId });

    if (existingRating) {
      // Update existing rating
      existingRating.rating = rating;
      existingRating.feedback = feedback;
      await existingRating.save();
    } else {
      // Create new rating
      await AppRating.create({
        user_id: userId,
        rating,
        feedback
      });
    }

    res.status(200).json({
      status: true,
      message: 'Thanks for your feedback!'
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message
    });
  }
};