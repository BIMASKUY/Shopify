import { Injectable } from '@nestjs/common';
import { shopifyApi, Session, Shopify, LATEST_API_VERSION } from '@shopify/shopify-api';
import '@shopify/shopify-api/adapters/node';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AppService {
  private shopify: Shopify;
  private session: Session;
  private client: any;
  private generativeAIClient: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.shopify = shopifyApi({
      apiKey: process.env.SHOPIFY_API_KEY,
      apiSecretKey: process.env.SHOPIFY_API_SECRET_KEY,
      scopes: ['read_products'],
      hostName: process.env.SHOPIFY_URL,
      apiVersion: LATEST_API_VERSION,
      isEmbeddedApp: true,
    });

    this.session = new Session({
      shop: process.env.SHOPIFY_URL,
      accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
      id: uuidv4(),
      state: uuidv4(),
      isOnline: true,
    });

    this.client = new this.shopify.clients.Rest({ session: this.session });

    this.generativeAIClient = new GoogleGenerativeAI(process.env.GOOGLE_CLOUD_API_KEY);

    this.model = this.generativeAIClient.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async fetchOrders() {
    const response = await this.client.get({
      path: 'orders',
      query: { status: 'any', limit: 3, order: 'line_items_count DESC' },
    });

    return {
      success: true,
      message: 'Orders retrieved successfully',
      data: response.body.orders,
    };
  }

  async fetchCustomer() {
    const response = await this.client.get({
      path: 'customers',
      query: { limit: 3, order: 'total_spent DESC' },
    });

    return {
      success: true,
      message: 'Customer data retrieved successfully',
      data: response.body.customers,
    };
  }

  async fetchSalesForecast() {
    const ordersResponse = await this.client.get({ 
      path: 'orders',
      query: { status: 'any' },
    });
    const orders = ordersResponse.body.orders;
  
    if (orders.length === 0) {
      return {
        success: false,
        message: 'Orders data still empty',
        data: [],
      };
    }
  
    const salesData = orders.map(order => ({
      date: order.created_at,
      totalPrice: parseFloat(order.total_price)
    })).filter(order => !isNaN(order.totalPrice));
  
    if (salesData.length === 0) {
      return {
        success: false,
        message: 'No valid sales data available for forecasting',
        data: [],
      };
    }
  
    const salesDataString = JSON.stringify(salesData, null, 2);
    const prompt = `Based on the following sales data, predict the sales for the future:\n${salesDataString}`;
  
    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const forecastData = await response.text();
  
    return {
      success: true,
      message: 'Sales forecast retrieved successfully',
      data: forecastData,
    };
  }

  async fetchChurnPrediction() {
    const customersResponse = await this.client.get({ path: 'customers' });
    const customers = customersResponse.body.customers;
  
    if (customers.length === 0) {
      return {
        success: false,
        message: 'Customer data still empty',
        data: [],
      };
    }
  
    const customerData = customers.map(customer => ({
      id: customer.id,
      ordersCount: customer.orders_count,
      lastOrderDate: customer.last_order_date,
      totalSpent: parseFloat(customer.total_spent)
    })).filter(customer => !isNaN(customer.totalSpent));
  
    if (customerData.length === 0) {
      return {
        success: false,
        message: 'No valid customer data available for churn prediction',
        data: [],
      };
    }
  
    const customerDataString = JSON.stringify(customerData, null, 2);
    const prompt = `Based on the following customer data, predict the churn rate:\n${customerDataString}`;
  
    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const churnPrediction = await response.text();
  
    return {
      success: true,
      message: 'Churn prediction retrieved successfully',
      data: churnPrediction,
    };
  }
}