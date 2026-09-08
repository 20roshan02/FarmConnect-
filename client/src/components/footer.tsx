const Footer = () => {
  return (
    <footer className="bg-gray-400 text-gray-300 pb-1">
      
      <div className="border-t border-gray-900 text-center py-4 text-sm text-gray-500">
        © {new Date().getFullYear()} AgroMarket. All rights reserved.
      </div>

    </footer>
  );
};

export default Footer;