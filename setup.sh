#!/bin/bash
# Setup script for Kiosco Manager

echo "🏪 Kiosco Manager - Setup"
echo "=========================="

echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
  echo "❌ Error installing dependencies"
  exit 1
fi

echo ""
echo "🗄  Creating database..."
npm run db:push

if [ $? -ne 0 ]; then
  echo "❌ Error creating database"
  exit 1
fi

echo ""
echo "🌱 Loading seed data..."
npm run db:seed

if [ $? -ne 0 ]; then
  echo "❌ Error loading seed data"
  exit 1
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "👤 Users created:"
echo "   admin / admin123 (ADMIN)"
echo "   colaborador / colab123 (COLABORADOR)"
echo ""
echo "🚀 To start the app:"
echo "   npm run dev"
echo ""
echo "   Then open: http://localhost:3000"
