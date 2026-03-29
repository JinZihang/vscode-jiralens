pipeline {
    agent none

    when {
        anyOf {
            branch 'main'
            changeRequest()
        }
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {
        stage('Prepare') {
            agent {
                docker {
                    image 'node:20-alpine'
                    args '--user root'
                    reuseNode true
                }
            }
            steps {
                echo 'Docker environment ready'
            }
        }

        stage('Install') {
            agent {
                docker {
                    image 'node:20-alpine'
                    args '--user root'
                    reuseNode true
                }
            }
            steps {
                retry(2) {
                    sh 'npm ci'
                }
            }
        }

        stage('Build') {
            agent {
                docker {
                    image 'node:20-alpine'
                    args '--user root'
                    reuseNode true
                }
            }
            steps {
                retry(2) {
                    sh 'npm run compile'
                }
            }
        }

        stage('Test') {
            agent {
                docker {
                    image 'node:20-alpine'
                    args '--user root'
                    reuseNode true
                }
            }
            steps {
                retry(2) {
                    sh 'npm run test'
                }
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: '**/test-results/**/*.xml'
                }
            }
        }
    }

    post {
        success {
            echo "Pipeline passed on ${env.BRANCH_NAME}"
        }
        failure {
            echo "Pipeline failed on ${env.BRANCH_NAME}"
        }
    }
}
