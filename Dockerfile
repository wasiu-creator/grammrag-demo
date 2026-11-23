FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY GraMM-RAG_Portal.html /usr/share/nginx/html/
COPY portal_docs/ /usr/share/nginx/html/portal_docs/
EXPOSE 80
