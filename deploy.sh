#!/bin/bash

# Dhanno Deployment Script for Raspberry Pi with OpenMediaVault
# This script prepares and deploys the Dhanno application

set -e

echo "🚀 Starting Dhanno deployment on Raspberry Pi..."

# Function to generate random password
generate_password() {
    openssl rand -base64 32
}

# Function to generate JWT secret
generate_jwt_secret() {
    openssl rand -base64 64
}

# Check if Docker and Docker Compose are installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo "❌ Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    echo "✅ Docker and Docker Compose are installed"
}

# Create environment file
setup_env() {
    if [ ! -f .env ]; then
        echo "🔧 Creating environment file..."
        cp .env.example .env
        
        # Generate secure passwords
        DB_PASSWORD=$(generate_password)
        JWT_SECRET=$(generate_jwt_secret)
        
        # Update .env file with generated values using different delimiter
        sed -i "s|your_very_secure_database_password|$DB_PASSWORD|" .env
        sed -i "s|your_jwt_secret_key_at_least_32_characters_long|$JWT_SECRET|" .env
        
        echo "✅ Environment file created with secure passwords"
        echo "📝 Database password: $DB_PASSWORD"
        echo "🔑 JWT Secret: ${JWT_SECRET:0:20}..."
    else
        echo "✅ Environment file already exists"
    fi
}

# Build and start services
deploy() {
    echo "🏗️ Building and starting services..."
    
    # Stop existing containers
    docker-compose down 2>/dev/null || true
    
    # Build and start services
    docker-compose up -d --build
    
    echo "⏳ Waiting for services to start..."
    sleep 30
    
    # Run database migrations
    echo "🗄️ Running database migrations..."
    docker-compose exec backend npx prisma migrate deploy || true
    
    # Check service health
    echo "🔍 Checking service health..."
    
    # Check backend health
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Backend is healthy"
    else
        echo "⚠️ Backend health check failed"
    fi
    
    # Check frontend
    if curl -f http://localhost > /dev/null 2>&1; then
        echo "✅ Frontend is accessible"
    else
        echo "⚠️ Frontend health check failed"
    fi
    
    echo "🎉 Deployment complete!"
    echo "📱 Frontend: http://$(hostname -I | awk '{print $1}')"
    echo "🔌 Backend API: http://$(hostname -I | awk '{print $1}'):3001"
    echo "🗄️ Database: localhost:5432"
}

# Show logs
show_logs() {
    echo "📋 Showing container logs..."
    docker-compose logs -f
}

# Main execution
main() {
    case "${1:-deploy}" in
        "check")
            check_docker
            ;;
        "setup")
            setup_env
            ;;
        "deploy")
            check_docker
            setup_env
            deploy
            ;;
        "logs")
            show_logs
            ;;
        "stop")
            docker-compose down
            echo "🛑 Services stopped"
            ;;
        "restart")
            docker-compose restart
            echo "🔄 Services restarted"
            ;;
        *)
            echo "Usage: $0 {check|setup|deploy|logs|stop|restart}"
            exit 1
            ;;
    esac
}

main "$@"