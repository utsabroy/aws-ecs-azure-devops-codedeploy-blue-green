# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

FROM nginx:alpine

COPY ./nginx-sample/nginx.conf /etc/nginx/nginx.conf 
COPY ./nginx-sample/index.html /usr/share/nginx/html

ENTRYPOINT ["nginx", "-g", "daemon off;"]
