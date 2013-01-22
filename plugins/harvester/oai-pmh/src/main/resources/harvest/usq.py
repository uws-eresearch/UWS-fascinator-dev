import time

from com.googlecode.fascinator.api.storage import StorageException

class IndexData:
    def __init__(self):
        pass

    def __activate__(self, context):
        # Prepare variables
        self.index = context["fields"]
        self.object = context["object"]
        self.payload = context["payload"]
        self.params = context["params"]
        self.utils = context["pyUtils"]
        self.log = context["log"]

        # Common data
        self.__newDoc()

        # Real metadata
        if self.itemType == "object":
            self.__previews()
            self.__basicData()
            self.__metadata()

        # Make sure security comes after workflows
        self.__security()

    def __newDoc(self):
        self.oid = self.object.getId()
        self.pid = self.payload.getId()
        metadataPid = self.params.getProperty("metaPid", "DC")

        if self.pid == metadataPid:
            self.itemType = "object"
        else:
            self.oid += "/" + self.pid
            self.itemType = "datastream"
            self.utils.add(self.index, "identifier", self.pid)

        self.utils.add(self.index, "id", self.oid)
        self.utils.add(self.index, "storage_id", self.oid)
        self.utils.add(self.index, "item_type", self.itemType)
        self.utils.add(self.index, "last_modified", time.strftime("%Y-%m-%dT%H:%M:%SZ"))
        self.utils.add(self.index, "harvest_config", self.params.getProperty("jsonConfigOid"))
        self.utils.add(self.index, "harvest_rules",  self.params.getProperty("rulesOid"))
        self.utils.add(self.index, "display_type", "OaiPmhDC")

    def __basicData(self):
        self.utils.add(self.index, "repository_name", self.params["repository.name"])
        self.utils.add(self.index, "repository_type", self.params["repository.type"])

    def __previews(self):
        self.previewPid = None
        for payloadId in self.object.getPayloadIdList():
            try:
                payload = self.object.getPayload(payloadId)
                if str(payload.getType())=="Thumbnail":
                    self.utils.add(self.index, "thumbnail", payload.getId())
                elif str(payload.getType())=="Preview":
                    self.previewPid = payload.getId()
                    self.utils.add(self.index, "preview", self.previewPid)
                elif str(payload.getType())=="AltPreview":
                    self.utils.add(self.index, "altpreview", payload.getId())
            except StorageException, e:
                pass

    def __security(self):
        roles = self.utils.getRolesWithAccess(self.oid)
        if roles is not None:
            for role in roles:
                self.utils.add(self.index, "security_filter", role)
        else:
            # Default to guest access if Null object returned
            schema = self.utils.getAccessSchema("derby");
            schema.setRecordId(self.oid)
            schema.set("role", "guest")
            self.utils.setAccessSchema(schema, "derby")
            self.utils.add(self.index, "security_filter", "guest")

    def __getDcPayload(self):
        # Try for the source first
        pid = self.object.getSourceId()
        if pid is not None:
            try:
                payload = self.object.getPayload(pid)
                return payload
            except Exception, e:
                self.log.error("Source PID '{}' not accessible", pid, e)
                return None

        # Or 'dc.xml'
        else:
            self.log.error("Object '{}' has no SOURCE payload! Trying 'oai_dc.xml'...", self.oid)
            try:
                payload = self.object.getPayload("oai_dc.xml")
                self.log.warn("... found 'oai_dc.xml' in object '{}'. Using it instead.", self.oid)
                return payload
            except StorageException, e:
                self.log.error("... 'oai_dc.xml' not found either. Please check harvest logs, object '{}' does not appear to harvested correctly.", self.oid)
                return None

    def __metadata(self):
        self.utils.registerNamespace("oai_dc", "http://www.openarchives.org/OAI/2.0/oai_dc/")
        self.utils.registerNamespace("dc", "http://purl.org/dc/elements/1.1/")

        dcPayload = self.__getDcPayload()
        if dcPayload is None:
            title = "Unknown %s" % self.oid
            self.utils.add(self.index, "title", title)
            self.utils.add(self.index, "dc_title", title)
            description = "Error during harvest/index for item '%s'. Could not access metadata from storage." % self.oid
            self.utils.add(self.index, "description", description)
            self.utils.add(self.index, "dc_description", description)
            return
        dc = self.utils.getXmlDocument(dcPayload.open())
        dcPayload.close()

        # Make sure we only get one type
        dcType = None
        nodes = dc.selectNodes("//dc:*")
        for node in nodes:
            name = "dc_" + node.getName()
            text = node.getTextTrim()
            if name == "dc_type":
                # Only index the first type
                if dcType is None:
                    self.utils.add(self.index, name, text)
                    dcType = text
            else:
                self.utils.add(self.index, name, text)
            # Make sure we get the title and description just for the Fascinator
            if name == "dc_title":
                self.utils.add(self.index, "title", text)
            if name == "dc_description":
                self.utils.add(self.index, "description", text)
