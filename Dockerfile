FROM node:20

RUN git clone https://github.com/KING-DAVIDX/Queen_Alya.git /root/Queen_Alya

# Clear npm cache and remove node_modules directories
RUN npm cache clean --force
RUN rm -rf /root/Queen_Alya/node_modules

# Install dependencies
WORKDIR /root/Queen_Alya
RUN npm install

# Add additional Steps To Run...
EXPOSE 3000
CMD ["npm","start" ]
# IF YOU ARE MODIFYING THIS BOT DONT CHANGE THIS  RUN rm -rf /root/Queen_Alya/node_modules
