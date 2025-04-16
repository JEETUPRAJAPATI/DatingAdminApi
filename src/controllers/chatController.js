import Message from '../models/chatModel.js';
import User from '../models/userModel.js';

export const getChatUsers = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get unique users who have exchanged messages with the current user
    const chatUsers = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender_id: userId },
            { receiver_id: userId }
          ],
          deleted_for: { $ne: userId }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender_id', userId] },
              '$receiver_id',
              '$sender_id'
            ]
          },
          last_message: { $first: '$message' },
          last_message_date: { $first: '$createdAt' }
        }
      }
    ]);

    // Get user details and unread counts
    const userList = await Promise.all(chatUsers.map(async (chat) => {
      const otherUser = await User.findById(chat._id).select('name profile_image').lean();
      
      const unreadCount = await Message.countDocuments({
        sender_id: chat._id,
        receiver_id: userId,
        read: false,
        deleted_for: { $ne: userId }
      });

      return {
        id: otherUser._id,
        name: otherUser.name,
        last_message: chat.last_message,
        profile: otherUser.profile_image,
        unread_count: unreadCount
      };
    }));

    res.status(200).json({
      status: true,
      users: userList
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message
    });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const otherUserId = req.params.user_id;

    const messages = await Message.find({
      $or: [
        { sender_id: userId, receiver_id: otherUserId },
        { sender_id: otherUserId, receiver_id: userId }
      ],
      deleted_for: { $ne: userId }
    })
    .sort({ createdAt: 1 })
    .lean();

    // Mark messages as read
    await Message.updateMany(
      {
        sender_id: otherUserId,
        receiver_id: userId,
        read: false
      },
      { read: true }
    );

    res.status(200).json({
      status: true,
      messages: messages.map(msg => ({
        sender_id: msg.sender_id,
        receiver_id: msg.receiver_id,
        type: msg.type,
        message: msg.message,
        file_url: msg.file_url,
        timestamp: msg.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message
    });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { receiver_id, type, message } = req.body;
    let fileUrl = '';

    // Handle file upload if present
    if (req.file && ['image', 'audio', 'doc'].includes(type)) {
      fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    const newMessage = await Message.create({
      sender_id: senderId,
      receiver_id,
      type,
      message: type === 'text' ? message : req.file.originalname,
      file_url: fileUrl
    });

    res.status(200).json({
      status: true,
      message: 'Message sent successfully',
      data: {
        id: newMessage._id,
        timestamp: newMessage.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message
    });
  }
};