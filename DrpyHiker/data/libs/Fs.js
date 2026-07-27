var Fs = (function() {

    const Files = java.nio.file.Files;
    const Paths = java.nio.file.Paths;
    const StandardCopyOption = java.nio.file.StandardCopyOption;
    const StandardOpenOption = java.nio.file.StandardOpenOption;
    const BasicFileAttributes = java.nio.file.attribute.BasicFileAttributes;
    const SimpleFileVisitor = java.nio.file.SimpleFileVisitor;
    const FileVisitResult = java.nio.file.FileVisitResult;

    // 定义FileError异常类
    function FileError(message, e) {
        this.message = message;
        this.name = 'FileError';

    }
    let stats_attrs = Symbol("stats_attrs");
    let stats_path = Symbol("stats_path");

    function Stats(path) {
        this[stats_attrs] = Files.readAttributes(path, BasicFileAttributes);
        this[stats_path] = path;
    }
    // Stats类，用来获取文件或目录的属性
    Object.assign(Stats.prototype, {
        isFile() {
            return !!this[stats_attrs].isRegularFile();
        },
        isDirectory() {
            return !!this[stats_attrs].isDirectory();
        },
        size() {
            return Number(this[stats_attrs].size());
        },
        name() {
            return String(this[stats_path].getFileName().toString());
        },
        etype() {
            var fileName = this.name();
            var dotIndex = fileName.lastIndexOf('.');
            return dotIndex != -1 ? fileName.substring(dotIndex + 1) : '';
        },
        path() {
            return String(this[stats_path].toString());
        },
        atime() {
            return Number(this[stats_attrs].lastAccessTime().toMillis());
        },
        mtime() {
            return Number(this[stats_attrs].lastModifiedTime().toMillis());
        },
        birthtime() {
            return Number(this[stats_attrs].creationTime().toMillis());
        },
        woename() {
            var fileName = this.name();
            var dotIndex = fileName.lastIndexOf('.');
            return dotIndex != -1 ? fileName.slice(0, dotIndex) : fileName;
        },
        toJson() {
            return {
                isFile: this.isFile(),
                isDirectory: this.isDirectory(),
                size: this.size(),
                name: this.name(),
                etype: this.etype(),
                path: this.path(),
                atime: this.atime(),
                mtime: this.mtime(),
                birthtime: this.birthtime(),
                woename: this.woename()
            };
        },
        toString() {
            return "Stat@" + JSON.stringify(this.toJson());
        }
    });

    return {
        // stat函数：获取文件或目录的状态
        stat(path) {
            try {
                return new Stats(Paths.get(path));
            } catch (e) {
                return null;
                //throw new FileError("Failed to get file stats for path: " + path);
            }
        },

        // writeFile函数：写入文件
        writeFile(file, data, encoding) {
            try {
                if (typeof data === 'string') {
                    Files.write(Paths.get(file), new java.lang.String(data).getBytes(encoding || 'UTF-8'));
                } else {
                    Files.write(Paths.get(file), data);
                }
                return true;
            } catch (e) {
                return false;
                //throw new FileError("Failed to write file: " + file);
            }
        },

        // readFile函数：读取文件
        readFile(path, encoding) {
            try {
                var content = Files.readAllBytes(Paths.get(path));
                return new java.lang.String(content, encoding || 'UTF-8');
            } catch (e) {
                return null;
                //throw new FileError("Failed to read file: " + path);
            }
        },
        readAllUint8s(path) {
            try {
                var content = Files.readAllBytes(Paths.get(path));
                return new Uint8Array(Array.from(content));
            } catch (e) {
                return null;
                //throw new FileError("Failed to read file: " + path);
            }
        },
        readAllBytes(path){
            try{
                return Files.readAllBytes(Paths.get(path));
            }catch(e){
                return null;
            }
        },
        // listDir函数：列出目录内容
        listDir(path, withFileStats) {
            var result = [];
            var stream;
            try {
                stream = Files.newDirectoryStream(Paths.get(path));
                var iterator = stream.iterator();
                while (iterator.hasNext()) {
                    var entry = iterator.next();
                    if (withFileStats) {
                        result.push(new Stats(entry));
                    } else {
                        result.push(String(entry.toString()));
                    }
                }

            } catch (e) {
                return [];
                //throw new FileError("Failed to list directory: " + path);
            } finally {
                if (stream) stream.close();
            }
            return result;
        },

        // mkDir函数：创建目录
        mkDir(path) {
            try {
                Files.createDirectories(Paths.get(path));
                return true;
            } catch (e) {
                return false;
                //throw new FileError("Failed to create directory: " + path);
            }
        },

        // rename函数：重命名文件或目录
        rename(oldPath, newPath) {
            try {
                let oldPaths = Paths.get(oldPath);
                let oldPerPaths = oldPaths.getParent();
                let newPaths = oldPerPaths ? oldPerPaths.resolve(Paths.get(newPath)) : Paths.get(newPath);
                Files.move(oldPaths, newPaths);
            } catch (e) {
                throw new FileError("Failed to rename file or directory: " + oldPath + " to " + newPath);
            }
        },

        // remove函数：删除文件或空目录
        remove(path) {
            try {
                return Files.deleteIfExists(Paths.get(path));
            } catch (e) {
                return false;
                //throw new FileError("Failed to remove file or directory: " + path);
            }
        },

        // removeDir函数：删除非空目录
        // removeDir函数：删除非空目录
        removeDir(path) {
            try {
                let directory = Paths.get(path);

                // 递归删除文件和目录
                function deleteRecursively(dir) {
                    let stream = null;
                    try {
                        stream = Files.newDirectoryStream(dir);
                        for (let entry of stream) {
                            if (Files.isDirectory(entry)) {
                                // 递归删除子目录
                                deleteRecursively(entry);
                            } else {
                                // 如果是普通文件，直接删除
                                Files.delete(entry);
                            }
                        }
                    } finally {
                        if (stream) {
                            stream.close();
                        }
                    }
                    // 最后删除空目录（dir）
                    Files.delete(dir);
                }

                deleteRecursively(directory);
                return true;
            } catch (e) {
                log(e.toString());
                return false;
                // throw new FileError("Failed to remove directory and its contents: " + String(e));
            }
        },


        // appendFile函数：追加写入文件
        appendFile(path, data, encoding) {
            try {
                if (typeof data === 'string') {
                    Files.write(Paths.get(path), new java.lang.String(data).getBytes(encoding || 'UTF-8'), StandardOpenOption.APPEND, StandardOpenOption.CREATE);
                } else {
                    Files.write(Paths.get(path), data, StandardOpenOption.APPEND, StandardOpenOption.CREATE);
                }
                return true;
            } catch (e) {
                return false;
                //throw new FileError("Failed to append data to file: " + path);
            }
        },

        // copyFile函数：复制文件
        copyFile(src, dest, force) {
            try {
                let destination = Paths.get(dest);
                let destinationDir = destination.getParent();
                if (!Files.exists(destinationDir)) {
                    Files.createDirectories(destinationDir);
                }
                let srcPath = Paths.get(src);
                if (force) {
                    Files.copy(srcPath, destination, StandardCopyOption.REPLACE_EXISTING);
                } else {
                    if (Files.exists(destination)) {
                        return;
                    } else {
                        Files.copy(srcPath, destination);
                    }
                }
                return true;
            } catch (e) {
                //log(e.toString());
                return false;
                //throw new FileError("Failed to copy file: " + src + " to " + dest);
            }
        },

        // copyDir函数：复制目录
        copyDir(src, dest, force, filter) {
            try {
                let sourceDir = Paths.get(src);
                let destinationDir = Paths.get(dest);

                // 确保目标目录存在
                if (!Files.exists(destinationDir)) {
                    Files.createDirectories(destinationDir);
                }

                // 递归复制文件和目录
                function copyRecursively(source, target) {
                    let stream = null;
                    try {
                        stream = Files.newDirectoryStream(source);
                        for (let entry of stream) {
                            let targetPath = target.resolve(source.relativize(entry)); // 相对路径
                            if (Files.isDirectory(entry)) {
                                // 递归复制目录
                                if (!Files.exists(targetPath)) {
                                    Files.createDirectories(targetPath);
                                }
                                copyRecursively(entry, targetPath);
                            } else {
                                // 复制文件
                                if (!filter || filter(String(entry.toString()), String(targetPath.toString()))) {
                                    if (force) {
                                        Files.copy(entry, targetPath, StandardCopyOption.REPLACE_EXISTING);
                                    } else {
                                        if (!Files.exists(targetPath)) {
                                            Files.copy(entry, targetPath);
                                        }
                                    }
                                }
                            }
                        }
                    } finally {
                        if (stream) {
                            stream.close(); // 确保流关闭
                        }
                    }
                }

                copyRecursively(sourceDir, destinationDir);
                return true;
            } catch (e) {
                throw new FileError("Failed to copy directory: " + src + " to " + dest + " @" + String(e));
            }
        },

        // exists函数：判断路径是否存在
        exists(path) {
            return !!Files.exists(Paths.get(path));
        },

        // move函数：移动文件或目录
        move(fromPath, toPath, force) {
            try {
                var target = Paths.get(toPath);
                if (force && Files.exists(target)) {
                    Files.delete(target);
                }
                Files.move(Paths.get(fromPath), target, StandardCopyOption.REPLACE_EXISTING);
                return true;
            } catch (e) {
                return false;
                //throw new FileError("Failed to move file: " + fromPath + " to " + toPath);
            }
        },

        // getName函数：获取文件名
        getName(path) {
            return String(Paths.get(path).getFileName().toString());
        },

        // getExtension函数：获取文件扩展名
        getExtension(path) {
            var fileName = this.getName(path);
            var dotIndex = fileName.lastIndexOf('.');
            return dotIndex != -1 ? fileName.substring(dotIndex + 1) : '';
        },

        // moveDir函数：移动目录
        moveDir(src, dest, force, filter) {
            if (this.copyDir(src, dest, force, filter)) {
                return this.removeDir(src);
            }
            return false;
        },
        getParentPath(path) {
            try {
                var parentPath = Paths.get(path).getParent();
                if (parentPath != null) {
                    return String(parentPath.toString());
                } else {
                    return null; // 如果没有父路径，则返回null
                }
            } catch (e) {
                return null;
            }
        },
        combinPath(dire, path) {
            let Proto = '';
            if (dire.includes("//")) {
                let _="";
                [Proto, _, dire] = dire.split(/(\/{2})/);
                Proto += _;
            }
            const Paths = java.nio.file.Paths;
            dire = dire + path;
            var p = Paths.get(dire).toAbsolutePath().normalize();
            return Proto + String(p);
        },
        getFormatSize(size) {
            if (size < 0) {
                return null;
            }
            let unitForm = ["Byte", "KB", "MB", "GB", "TB"];
            for (let i = 0, len = unitForm.length; i < len; i++) {
                if (size > 1024) {
                    size /= 1024;
                    continue;
                } else {
                    return Math.ceil(size) + unitForm[i];
                }
            }
            return String(size);
        }
    };
})();


$.exports = Fs;