# Aspectow Jetty Edition

Aspectow Jetty Edition is a lightweight, all-in-one web application server built on the Aspectran framework and powered by Eclipse Jetty. It provides a pre-configured, ready-to-run environment for developing and deploying modern web applications that fully support the Servlet 6.0 specification.

This edition is ideal for developers who prefer the flexibility and performance of Jetty, a popular and mature web server.

## Key Features

- **Jetty-Powered**: Built on Eclipse Jetty 12, a lightweight and high-performance web server.
- **Servlet 6.0 Support**: Fully compliant with the latest servlet specifications.
- **Built on Aspectran**: Inherits all the core features of the Aspectran framework, including AOP and IoC.
- **All-in-One Server**: A complete, runnable server environment with no complex setup required.
- **Easy to Run and Manage**: Simple build process and command-line tools for server management.

## Requirements

- Java 21 or later
- Maven 3.9.4 or later

## Building from Source

Follow these steps to build Aspectow Jetty Edition from the source code:

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/aspectran/aspectow-jetty.git
    ```

2.  **Navigate to the project directory:**
    ```sh
    cd aspectow-jetty
    ```

3.  **Build the project with Maven:**
    This will compile the source code and package the application.
    ```sh
    mvn clean package
    ```

## Running the Server

Once the project is built, you can start the server using the Aspectran Shell.

1.  **Navigate to the `bin` directory:**
    ```sh
    cd app/bin
    ```

2.  **Start the Aspectran Shell:**
    ```sh
    ./shell.sh
    ```
    This will launch an interactive shell for managing the server.

3.  **Access the application:**
    Once the server is running, you can access the default web application in your browser at [http://localhost:8081](http://localhost:8081).

## Contributing

We welcome contributions! If you'd like to contribute, please fork the repository and submit a pull request. For major changes, please open an issue to discuss your ideas.

## License

Aspectow Jetty Edition is licensed under the [Apache License 2.0](LICENSE.txt).
