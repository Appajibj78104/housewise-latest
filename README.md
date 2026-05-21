# HouseWife Services Platform

A comprehensive web application connecting skilled housewives with local customers for various home services. This platform empowers women entrepreneurs while providing trusted, affordable services to communities.

## 🌟 Features

### For Customers
- **Browse Services**: Discover various services (cooking, tailoring, tuition, beauty, cleaning, childcare, etc.)
- **Advanced Search**: Filter by location, category, price range, and ratings
- **Easy Booking**: Schedule services with flexible timing and real-time updates
- **Secure Payments**: Multiple payment methods with transparent pricing
- **Reviews & Ratings**: Read and write detailed reviews for service providers
- **Real-time Tracking**: Track booking status and communicate with providers
- **Invoice Management**: Download and manage service invoices
- **Saved Providers**: Bookmark favorite providers for quick access

### For Service Providers
- **Profile Management**: Create detailed profiles showcasing skills and experience
- **Service Listings**: Add multiple services with descriptions, pricing, and availability
- **Booking Management**: Accept, manage, and track service requests
- **Earnings Dashboard**: Monitor income and completed services
- **Customer Communication**: Real-time messaging with customers
- **Rating System**: Build reputation through customer reviews
- **Badge System**: Earn badges based on performance and customer satisfaction

### For Administrators
- **User Management**: Oversee all users and their activities
- **Analytics Dashboard**: Monitor platform performance and metrics
- **Content Moderation**: Manage reviews and reported content
- **System Settings**: Configure platform parameters and rules

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **JWT** for secure authentication
- **bcryptjs** for password encryption
- **Socket.io** for real-time communication
- **Cloudinary** for image management
- **SendGrid** for email notifications
- **Mongoose-based Models** for robust data management

### Frontend
- **React 19** with modern hooks and Suspense
- **Vite** for optimized development and production builds
- **React Router v7** for client-side navigation
- **Tailwind CSS** for responsive styling
- **Axios** with interceptors for API communication
- **Framer Motion** for smooth animations
- **React Query** for state management
- **Lucide React** for consistent iconography
- **React Hot Toast** for user notifications

## 📋 Project Structure

```
housewife-services-app/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/       # Reusable React components
│   │   ├── pages/            # Page components
│   │   ├── services/         # API integration
│   │   ├── context/          # Global state (Auth, Theme)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── styles/           # Global and component styles
│   │   └── utils/            # Utility functions
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── backend/                  # Node.js/Express API
│   ├── controllers/          # Route controllers
│   ├── models/               # MongoDB schemas
│   ├── routes/               # API endpoints
│   ├── middleware/           # Express middleware
│   ├── config/               # Configuration files
│   ├── jobs/                 # Scheduled tasks
│   ├── services/             # Business logic
│   ├── utils/                # Helper utilities
│   ├── package.json
│   └── server.js             # Entry point
│
├── .gitignore
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn
- MongoDB database
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/housewife-services-app.git
   cd housewife-services-app
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```
   
   Create a `.env` file in the backend directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/housewife-services
   JWT_SECRET=your_jwt_secret_here
   JWT_EXPIRE=7d
   CLOUDINARY_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   SENDGRID_API_KEY=your_sendgrid_key
   NODE_ENV=development
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```
   
   Create a `.env` file in the frontend directory:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

### Running the Application

1. **Start the Backend**
   ```bash
   cd backend
   npm start
   # or for development with auto-reload
   npm run dev
   ```
   The backend will run on `http://localhost:5000`

2. **Start the Frontend (in a new terminal)**
   ```bash
   cd frontend
   npm run dev
   ```
   The frontend will run on `http://localhost:5173`

3. **Access the Application**
   - Open your browser and navigate to `http://localhost:5173`
   - Register as a customer or service provider
   - Start exploring the platform!

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for secure password storage
- **Input Validation**: Comprehensive validation on all endpoints
- **XSS Protection**: Input sanitization across the platform
- **CORS Protection**: Configured cross-origin requests
- **Environment Variables**: Sensitive data in .env files (never committed)

## 📱 Features Implementation

- **Real-time Updates**: Socket.io integration for live booking status
- **Image Uploads**: Cloudinary integration for profile pictures and service images
- **Email Notifications**: SendGrid for transactional emails
- **Dark/Light Theme**: Automatic theme switching with CSS variables
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Type-safe Frontend**: Structured component architecture
- **API Error Handling**: Comprehensive error responses and logging

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support, email support@housewife-services.com or open an issue on GitHub.

## 🙏 Acknowledgments

- Built with React and Node.js
- Styled with Tailwind CSS
- Database powered by MongoDB
- Deployed with modern DevOps practices

---

**Made with ❤️ to empower women entrepreneurs**

### Database Schema
- **Users**: Customer and provider profiles with authentication
- **Services**: Service listings with categories and pricing
- **Bookings**: Appointment management with status tracking
- **Reviews**: Rating and feedback system
- **Categories**: Service categorization with metadata

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd housewife-services-app
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Environment Configuration**
   
   Create `.env` file in the backend directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/housewife-services
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRE=7d
   NODE_ENV=development
   ```

   Create `.env` file in the frontend directory:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

5. **Database Seeding**
   ```bash
   cd backend
   npm run seed
   ```

6. **Start the Application**
   
   Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

   Start the frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```

7. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

## 👥 Demo Accounts

After running the seeder, you can use these demo accounts:

- **Admin**: admin@housewife-services.com / admin123456
- **Service Provider**: priya.sharma@example.com / password123
- **Customer**: customer@example.com / password123

## 📁 Project Structure

```
housewife-services-app/
├── backend/
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   ├── utils/           # Utility functions
│   ├── server.js        # Main server file
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── context/     # React context
│   │   ├── services/    # API services
│   │   ├── hooks/       # Custom hooks
│   │   └── utils/       # Utility functions
│   ├── public/          # Static assets
│   └── package.json
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Services
- `GET /api/services` - Get all services
- `GET /api/services/:id` - Get service by ID
- `POST /api/services` - Create new service
- `PUT /api/services/:id` - Update service
- `DELETE /api/services/:id` - Delete service

### Bookings
- `GET /api/bookings` - Get user bookings
- `POST /api/bookings` - Create new booking
- `PUT /api/bookings/:id/status` - Update booking status

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/housewives` - Get all service providers

## 🎨 Design Features

- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Modern UI**: Clean and intuitive interface with Tailwind CSS
- **Accessibility**: WCAG compliant with proper ARIA labels
- **Performance**: Optimized loading with lazy loading and code splitting
- **SEO Friendly**: Proper meta tags and structured data

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Input Validation**: Comprehensive validation on both client and server
- **CORS Protection**: Configured for secure cross-origin requests
- **Rate Limiting**: Protection against API abuse
- **Data Sanitization**: XSS and injection attack prevention

## 🚀 Deployment

### Backend Deployment
1. Set up MongoDB Atlas or your preferred database
2. Configure environment variables for production
3. Deploy to platforms like Heroku, Railway, or DigitalOcean
4. Set up SSL certificates for HTTPS

### Frontend Deployment
1. Build the production version: `npm run build`
2. Deploy to platforms like Vercel, Netlify, or AWS S3
3. Configure environment variables for production API URL

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Icons by Lucide React
- UI inspiration from modern design systems
- Community feedback and contributions

## 📞 Support

For support, email support@housewife-services.com or create an issue in the repository.

---

**Made with ❤️ for empowering women entrepreneurs**
