# HTTP Adaptive Server #


This server plays the role of a simple http server with preconfigured results stored in a single folder. 
It can be made to simulate any external REST server your system needs to interact with.

In order to function it needs a folder as argument.

In the configured folder it needs to exist a file called config.json which will contain
* port (mandatory)
* impersonating - the name of the server it stands for. This is just for readability purpose.
* the array of routes it responds to

Each route contains two fields
* the regular expression for route matching
* the name of the file to be served as answer
* the error code to be returned (if none specified 200 is the default response code)
* the HTTP method (if none specified the server will respond to both GET and POST) 

Each route response file will be expressed relative to the argument path. 

Example: starting the adaptive server with argument _/home/myUser/adaptive/jenkins_ and configuring 
a route to respond with contents of _login_succeeded.json_, the server will try to find on disk the 
/home/myUser/adaptive/jenkins/login_succeeded.json

This validation occurs at startup, if there is one route which is configured to respond with a file that
does not exist, the server will fail to start and will print out an error  .



If nothing is found the 404 response is sent to the client.


## HTTPS Support ##
The adaptive server supports listening to https. If you need to add https support, add the _https_ section on the config.json file

Inside the https section, specify the _key_ and _cert_ entries. The entries need to point to valid files on the file system.
The paths will be relative to configuration folder just like to routes

Alternatively to using key and cert, you can specify the _pfx_ file; this also needs to exist on disk.

If the key / cert / pfx files are password protected, use the _passphrase_ to specify the value.




## Administrative calls ##
The server supports some predefined routes that will be matched before any routes configured in config.json

- /calls - returns the list of calls. Each call will contain relevant information such as the moment of the call, the method, headers, the body etc. The method supports filtering by specifying a JSON payload called _filter_ which needs to contain _path_ and _value_. By default the result will return all calls.
- /calls/count - returns the number of HTTP calls
- /calls/reset - wipes out the call history and starts from scratch
- /stop stops the server


## Warning ##
This server is a standalone stub for real REST applications. You may risk running out of memory if hundreds or thousands of calls are executed against it. All the call history is stored in memory.