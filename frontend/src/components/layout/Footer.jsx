import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin,
  Heart
} from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    services: [
      { label: 'Cooking Services', href: '/services?category=cooking' },
      { label: 'Tailoring Services', href: '/services?category=tailoring' },
      { label: 'Tuition Services', href: '/services?category=tuition' },
      { label: 'Beauty Services', href: '/services?category=beauty' },
      { label: 'Cleaning Services', href: '/services?category=cleaning' },
      { label: 'Childcare Services', href: '/services?category=childcare' },
    ],
    company: [
      { label: 'About Us', href: '/about' },
      { label: 'How It Works', href: '/how-it-works' },
      { label: 'Safety', href: '/safety' },
      { label: 'Careers', href: '/careers' },
      { label: 'Press', href: '/press' },
      { label: 'Blog', href: '/blog' },
    ],
    support: [
      { label: 'Help Center', href: '/help' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'FAQs', href: '/faq' },
      { label: 'Community Guidelines', href: '/guidelines' },
      { label: 'Report Issue', href: '/report' },
      { label: 'Feedback', href: '/feedback' },
    ],
    legal: [
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Cookie Policy', href: '/cookies' },
      { label: 'Refund Policy', href: '/refund' },
      { label: 'Disclaimer', href: '/disclaimer' },
    ],
  };

  const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
  ];

  return (
    <footer className="bg-surface-raised border-t border-surface-border">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-coral-500 to-coral-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">H</span>
              </div>
              <span className="text-heading text-content-primary">HouseWise</span>
            </div>
            <p className="text-detail text-content-secondary mb-6 max-w-md">
              Connecting skilled housewives with local customers for quality home services. 
              Empowering women entrepreneurs while providing trusted, affordable services.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail size={14} className="text-coral-400" />
                <span className="text-caption text-content-muted">support@housewise.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone size={14} className="text-coral-400" />
                <span className="text-caption text-content-muted">+91 98765 43210</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin size={14} className="text-coral-400" />
                <span className="text-caption text-content-muted">Mumbai, Maharashtra, India</span>
              </div>
            </div>
          </div>

          {/* Services Links */}
          <div>
            <h3 className="text-heading text-content-primary mb-4">Services</h3>
            <ul className="space-y-2">
              {footerLinks.services.map((link, index) => (
                <li key={index}>
                  <Link to={link.href} className="text-caption text-content-muted hover:text-coral-400 transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-heading text-content-primary mb-4">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  <Link to={link.href} className="text-caption text-content-muted hover:text-coral-400 transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-heading text-content-primary mb-4">Support</h3>
            <ul className="space-y-2">
              {footerLinks.support.map((link, index) => (
                <li key={index}>
                  <Link to={link.href} className="text-caption text-content-muted hover:text-coral-400 transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter */}
        <div className="mt-12 pt-8 border-t border-surface-border">
          <div className="max-w-md">
            <h3 className="text-heading text-content-primary mb-3">Stay Updated</h3>
            <p className="text-caption text-content-muted mb-4">Get the latest updates on new services and features.</p>
            <div className="flex">
              <input type="email" placeholder="Enter your email" className="input rounded-r-none flex-1" />
              <button className="px-5 py-2 bg-coral-500 text-white rounded-r-xl hover:bg-coral-600 transition-colors text-detail font-medium">Subscribe</button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-1 text-caption text-content-muted">
              <span>© {currentYear} HouseWise. Made with</span>
              <Heart size={12} className="text-coral-500 fill-current" />
              <span>for empowering women entrepreneurs.</span>
            </div>
            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              {socialLinks.map((social, index) => {
                const IconComponent = social.icon;
                return (
                  <a key={index} href={social.href} target="_blank" rel="noopener noreferrer" className="p-2 text-content-muted hover:text-coral-400 hover:bg-surface-hover rounded-lg transition-colors" aria-label={social.label}>
                    <IconComponent size={16} />
                  </a>
                );
              })}
            </div>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              {footerLinks.legal.slice(0, 2).map((link, index) => (
                <Link key={index} to={link.href} className="text-micro text-content-muted hover:text-coral-400 transition-colors">{link.label}</Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
