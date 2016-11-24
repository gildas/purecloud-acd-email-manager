FROM node:7
MAINTAINER Gildas Cherruel <gildas.cherruel@inin.com>

WORKDIR /usr/local/src


COPY . /usr/local/src
RUN npm install

RUN npm --version
RUN nf --version

EXPOSE 3000
CMD [ "npm", "start" ]
