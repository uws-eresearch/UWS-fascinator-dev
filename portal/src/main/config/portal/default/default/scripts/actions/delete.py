from java.lang import Exception

class DeleteData:
    def __init__(self):
        pass

    def __activate__(self, context):
        self.vc = context
        self.log = context["log"]

        self.writer = self.vc["response"].getPrintWriter("text/html; charset=UTF-8")

        if self.vc["page"].authentication.is_logged_in() or self.vc["page"].authentication.is_admin():
            self.process()
        else:
            self.throw_error("Only administrative users can access this feature")

    def process(self):
        valid = self.vc["page"].csrfSecurePage()
        if not valid:
            self.throw_error("Invalid request")
            return

        record = self.vc["formData"].get("record")
        if record is None:
            self.throw_error("Record ID required")
            return

        errors = False
        storage = self.vc["Services"].getStorage();
        indexer = self.vc["Services"].getIndexer();

        # Delete from storage
        try:
            storage.removeObject(record)
        except Exception, e:
            self.vc["log"].error("Error deleting object from storage: ", e)
            errors = True

        # Delete from Solr
        try:
            indexer.remove(record)
        except Exception, e:
            self.vc["log"].error("Error deleting Solr entry: ", e)
            errors = True

        # Delete annotations
        try:
            indexer.annotateRemove(record)
        except Exception, e:
            self.vc["log"].error("Error deleting annotations: ", e)
            errors = True

        # Solr commit
        try:
            indexer.commit()
        except Exception, e:
            self.vc["log"].error("Error during Solr commit: ", e)
            errors = True

        if errors:
            self.throw_error("Error deleting object! Please see system logs.")
        else:
            self.writer.println(record)
            self.writer.close()

    def throw_error(self, message):
        self.log.error(message)
        self.vc["response"].setStatus(500)
        self.writer.println("Error: " + message)
        self.writer.close()
